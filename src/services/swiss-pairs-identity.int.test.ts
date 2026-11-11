// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import type { BoardOutcome } from "@/model/score";
import type { PairSeat } from "@/model/participants";

/**
 * A Swiss Pairs pair keeps ONE identity for the whole event.
 *
 * Regression: round 1 used to be written under each pair's seat ("A1NS") while
 * the drawn rounds used its stable Swiss number ("A1"), so from round 2 the
 * standings listed every pair twice (once per id, each with only part of its
 * VP), the next draw ranked on those split standings, and §3.5 mismatch
 * detection — which reads the same standings — could never flag anything.
 *
 * This drives the real start path (`startGame`), not a hand-built round 1.
 */

// The game-index lookup only supplies the game's type and scoring.
vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(async () => ({
    gameId: "g",
    gameType: "PAIRS",
    scoringType: "MP",
  })),
}));

const TABLES = 3;
const BOARDS_PER_ROUND = 2;

let tmpDir: string;
let gameId: string;

/** Seat a full field: the pair at seat S is named "S North" & "S South". */
async function seatField(seats: PairSeat[]) {
  const { createPairWithPlayers } =
    await import("@/db/games/actions/create-pair-with-players");
  for (const seat of seats) {
    await createPairWithPlayers(gameId, {
      initialSeat: seat,
      player1: { firstName: seat, lastName: "North" },
      player2: { firstName: seat, lastName: "South" },
      secretKey: `secret-${seat}`,
    });
  }
}

/** Confirm one result on every board a table plays in a round. */
async function setResult(round: number, table: number, result: BoardOutcome) {
  const games = await import("@/db/games");
  const { boards } = await import("@/db/games/tables/boards");
  const { and, eq } = await import("drizzle-orm");
  const db = (await games.getDb(gameId))!;
  await db
    .update(boards)
    .set({ confirmedResult: result, status: "CONFIRMED" })
    .where(and(eq(boards.roundNumber, round), eq(boards.tableNumber, table)));
}

async function boardIds(round: number): Promise<string[]> {
  const games = await import("@/db/games");
  const { boards } = await import("@/db/games/tables/boards");
  const { eq } = await import("drizzle-orm");
  const db = (await games.getDb(gameId))!;
  const rows = await db
    .select({ ns: boards.ns, ew: boards.ew })
    .from(boards)
    .where(eq(boards.roundNumber, round));
  return [...new Set(rows.flatMap((r) => [r.ns, r.ew]))].sort();
}

/** Start a 3-table Swiss MP game with every seat filled. */
async function startFullField() {
  const { createGameDb } = await import("@/db/games/actions/create-game");
  const { setSectionMovement } =
    await import("@/db/games/actions/set-section-movement");
  const { startGame } = await import("@/services/start-game-service");
  await createGameDb(gameId, TABLES);
  await setSectionMovement(gameId, "A", {
    source: "SWISS",
    swiss: { tables: TABLES, rounds: 4, boardsPerRound: BOARDS_PER_ROUND },
  });
  const seats: PairSeat[] = [];
  for (let t = 1; t <= TABLES; t++) seats.push(`A${t}NS`, `A${t}EW`);
  await seatField(seats);
  const started = await startGame(gameId);
  expect(started.canStart).toBe(true);
}

/** Draw the next round exactly as previewed, and commit it. */
async function drawNextRound() {
  const { previewNextSwissRound, commitNextSwissRound } =
    await import("@/services/draw-swiss-round-service");
  const preview = await previewNextSwissRound(gameId, "A");
  expect(preview.ok).toBe(true);
  if (!preview.ok) throw new Error("preview failed");
  const committed = await commitNextSwissRound(
    gameId,
    "A",
    preview.seating,
    preview.sitOutPairId ?? null,
  );
  expect(committed.ok).toBe(true);
}

describe("Swiss Pairs pair identity across rounds", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "swiss-identity-"));
    process.env.DATABASE_GAMES_URL = tmpDir;
    gameId = `game-${Math.random().toString(16).slice(2)}`;
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("round 1 records each pair under the same stable id the drawn rounds use", async () => {
    await startFullField();
    // NS pairs 1..3, EW pairs 4..6 — the ids every later round uses.
    expect(await boardIds(1)).toEqual(["A1", "A2", "A3", "A4", "A5", "A6"]);

    // Each seat's pair is found under that id.
    const { findPairs } = await import("@/db/games/queries/find-pairs");
    const anchors = Object.fromEntries(
      (await findPairs((await (await import("@/db/games")).getDb(gameId))!))
        .map((p) => [p.initialSeat, p.anchorId]),
    );
    expect(anchors).toEqual({
      A1NS: "A1",
      A2NS: "A2",
      A3NS: "A3",
      A1EW: "A4",
      A2EW: "A5",
      A3EW: "A6",
    });
  });

  it("after two rounds every pair is ONE named line carrying both rounds' VP", async () => {
    await startFullField();
    // Round 1: tables 1–3 make 6NT / 3NT / 1NT, spreading the field.
    await setResult(1, 1, "6NTN=");
    await setResult(1, 2, "3NTN=");
    await setResult(1, 3, "1NTN=");
    await drawNextRound();
    expect((await boardIds(2)).every((id) => /^A[1-6]$/.test(id))).toBe(true);
    await setResult(2, 1, "3NTN=");
    await setResult(2, 2, "3NTN=");
    await setResult(2, 3, "3NTN=");

    const { computeSectionLeaderboards } =
      await import("@/services/leaderboard-service");
    const games = await import("@/db/games");
    const db = (await games.getDb(gameId))!;
    const [section] = await computeSectionLeaderboards(db, gameId);
    const lines = section.overallScore.lines as unknown as {
      pairId: string;
      totalVP: number;
      vpByRound: Record<string, number>;
    }[];

    // Six pairs, six lines — no pair split across two ids.
    expect(lines.map((l) => l.pairId).sort()).toEqual([
      "A1",
      "A2",
      "A3",
      "A4",
      "A5",
      "A6",
    ]);
    // Each line has both rounds, and a round hands out 20 VP a match.
    for (const line of lines) {
      expect(Object.keys(line.vpByRound).sort()).toEqual(["1", "2"]);
    }
    const total = lines.reduce((sum, l) => sum + l.totalVP, 0);
    expect(total).toBe(2 * TABLES * 20);

    // Every line finds its pair's names (the participant ids match the lines).
    const ids = new Set(
      (section.participants as { id: string }[]).map((p) => p.id),
    );
    for (const line of lines) expect(ids.has(line.pairId)).toBe(true);
    const pair1 = (
      section.participants as {
        id: string;
        player1: { firstName: string };
      }[]
    ).find((p) => p.id === "A1")!;
    expect(pair1.player1.firstName).toBe("A1NS");
  });

  it("the next draw and mismatch detection see the whole field's standings", async () => {
    await startFullField();
    await setResult(1, 1, "6NTN=");
    await setResult(1, 2, "3NTN=");
    await setResult(1, 3, "1NTN=");
    await drawNextRound();
    await setResult(2, 1, "3NTN=");
    await setResult(2, 2, "3NTN=");
    await setResult(2, 3, "3NTN=");

    // The standings the draw ranks on cover every pair, once.
    const { decodeStandingsOrder, pairLeaderboardDecoder } =
      await import("@/services/leaderboard-standings-decode");
    const { computeSectionLeaderboards } =
      await import("@/services/leaderboard-service");
    const games = await import("@/db/games");
    const db = (await games.getDb(gameId))!;
    const [section] = await computeSectionLeaderboards(db, gameId);
    const order = decodeStandingsOrder(section, pairLeaderboardDecoder(TABLES));
    expect([...order].sort()).toEqual([1, 2, 3, 4, 5, 6]);

    // The board history the draw reads includes round 1's meetings.
    const { getSwissBoardHistory } =
      await import("@/db/games/queries/swiss-board-history");
    const history = await getSwissBoardHistory(db, "A", TABLES);
    expect(history.playedOpponents.size).toBe(2 * TABLES);

    // Rewrite round 1 so the order flips (table 3 now tops, table 1 floors):
    // round 2 was drawn on the old order, so detection now has candidates.
    await setResult(1, 1, "1NTN=");
    await setResult(1, 3, "6NTN=");
    const { detectSectionMismatches } =
      await import("@/services/detect-swiss-mismatch-service");
    const candidates = await detectSectionMismatches(gameId, "A");
    expect(candidates.length).toBeGreaterThan(0);
  });
});
