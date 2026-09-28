// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import type { BoardOutcome } from "@/model/score";

// The draw reads standings via the leaderboard, which needs the game's scoring
// type from the game-index. Mock it so the test stays on the per-game DB.
vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(async () => ({
    gameId: "g",
    gameType: "PAIRS",
    scoringType: "MP",
  })),
}));

let tmpDir: string;
let gameId: string;

describe("preview/commit next Swiss round", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "swiss-draw-"));
    process.env.DATABASE_GAMES_URL = tmpDir;
    gameId = `game-${Math.random().toString(16).slice(2)}`;
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // best-effort
    }
  });

  /**
   * Create a 2-table Swiss section, materialize round 1, and select the Swiss
   * movement. Returns nothing; the game db is ready for a draw.
   */
  async function setupSwiss(boardsPerRound = 2, totalRounds = 4) {
    const { createGameDb } = await import("@/db/games/actions/create-game");
    const { setSectionMovement } = await import(
      "@/db/games/actions/set-section-movement"
    );
    const { materializeSwissRound } = await import(
      "@/services/materialize-swiss-round"
    );

    await createGameDb(gameId, 2);
    await setSectionMovement(gameId, "A", {
      source: "SWISS",
      swiss: { tables: 2, rounds: totalRounds, boardsPerRound },
    });

    // Round 1 positional: T1 pair1(NS) vs pair3(EW); T2 pair2(NS) vs pair4(EW).
    await materializeSwissRound(
      gameId,
      "A",
      2,
      1,
      boardsPerRound,
      [
        { tableNumber: 1, ns: 1, ew: 3 },
        { tableNumber: 2, ns: 2, ew: 4 },
      ],
      null,
    );
  }

  /** Mark every round-`round` board CONFIRMED with a result. */
  async function confirmRound(round: number, result: BoardOutcome = "3NTN=") {
    const games = await import("@/db/games");
    const { boards } = await import("@/db/games/tables/boards");
    const { and, eq } = await import("drizzle-orm");
    const db = (await games.getDb(gameId))!;
    await db
      .update(boards)
      .set({ confirmedResult: result, status: "CONFIRMED" })
      .where(and(eq(boards.roundNumber, round)));
  }

  async function round2Boards() {
    const games = await import("@/db/games");
    const { boards } = await import("@/db/games/tables/boards");
    const { and, eq } = await import("drizzle-orm");
    const db = (await games.getDb(gameId))!;
    return db.select().from(boards).where(and(eq(boards.roundNumber, 2)));
  }

  it("preview rejects while the current round is not fully scored", async () => {
    await setupSwiss();
    const { previewNextSwissRound } = await import(
      "@/services/draw-swiss-round-service"
    );

    const result = await previewNextSwissRound(gameId, "A");
    expect(result).toEqual({ ok: false, reason: "ROUND_INCOMPLETE" });
  });

  it("preview computes seating but writes NOTHING", async () => {
    await setupSwiss();
    await confirmRound(1);

    const { previewNextSwissRound } = await import(
      "@/services/draw-swiss-round-service"
    );

    const result = await previewNextSwissRound(gameId, "A");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.roundNumber).toBe(2);
    expect(result.seating.length).toBe(2);

    // Crucially, no round-2 boards exist yet — the preview did not commit.
    expect(await round2Boards()).toHaveLength(0);
  });

  it("commit materializes the previewed seating with no repeat opponents", async () => {
    await setupSwiss();
    await confirmRound(1);

    const { previewNextSwissRound, commitNextSwissRound } = await import(
      "@/services/draw-swiss-round-service"
    );

    const preview = await previewNextSwissRound(gameId, "A");
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;

    const commit = await commitNextSwissRound(
      gameId,
      "A",
      preview.seating,
      preview.sitOutPairId,
    );
    expect(commit).toEqual({ ok: true, roundNumber: 2 });

    const round2 = await round2Boards();
    expect(new Set(round2.map((r) => r.boardNumber))).toEqual(new Set([3, 4]));

    // No round-2 matchup repeats a round-1 matchup.
    const round2Pairings = new Set(
      round2.map((r) => [r.ns, r.ew].sort().join("|")),
    );
    expect(round2Pairings.has(["A1NS", "A1EW"].sort().join("|"))).toBe(false);
    expect(round2Pairings.has(["A2NS", "A2EW"].sort().join("|"))).toBe(false);
  });

  it("commit persists a director-EDITED seating verbatim (Option B)", async () => {
    await setupSwiss();
    await confirmRound(1);

    const { commitNextSwissRound } = await import(
      "@/services/draw-swiss-round-service"
    );

    // Deliberately commit an arrangement that repeats round 1's pairings (an
    // override the director is allowed to make): pair 1 vs pair 3 again.
    const edited = [
      { tableNumber: 1, ns: 1, ew: 3 },
      { tableNumber: 2, ns: 2, ew: 4 },
    ];

    const commit = await commitNextSwissRound(gameId, "A", edited, null);
    expect(commit).toEqual({ ok: true, roundNumber: 2 });

    // The DB reflects EXACTLY the edited seating (the repeat pairing is present,
    // proving advisories don't block a commit).
    const round2 = await round2Boards();
    const pairings = new Set(round2.map((r) => [r.ns, r.ew].sort().join("|")));
    expect(pairings.has(["A1NS", "A1EW"].sort().join("|"))).toBe(true);
  });

  it("commit rejects a structurally-invalid seating and writes nothing", async () => {
    await setupSwiss();
    await confirmRound(1);

    const { commitNextSwissRound } = await import(
      "@/services/draw-swiss-round-service"
    );

    // Pair 1 seated twice, pair 4 missing.
    const invalid = [
      { tableNumber: 1, ns: 1, ew: 3 },
      { tableNumber: 2, ns: 1, ew: 2 },
    ];

    const commit = await commitNextSwissRound(gameId, "A", invalid, null);
    expect(commit).toEqual({ ok: false, reason: "INVALID_SEATING" });
    expect(await round2Boards()).toHaveLength(0);
  });

  it("preview rejects once every round has been drawn", async () => {
    await setupSwiss(2, 1);
    await confirmRound(1);

    const { previewNextSwissRound } = await import(
      "@/services/draw-swiss-round-service"
    );

    const result = await previewNextSwissRound(gameId, "A");
    expect(result).toEqual({ ok: false, reason: "EVENT_COMPLETE" });
  });

  it("preview rejects for a non-Swiss section", async () => {
    const { createGameDb } = await import("@/db/games/actions/create-game");
    const { setSectionMovement } = await import(
      "@/db/games/actions/set-section-movement"
    );
    await createGameDb(gameId, 2);
    await setSectionMovement(gameId, "A", {
      source: "MITCHELL",
      mitchell: { tables: 2, rounds: 2, boardsPerRound: 2 },
    });

    const { previewNextSwissRound } = await import(
      "@/services/draw-swiss-round-service"
    );
    const result = await previewNextSwissRound(gameId, "A");
    expect(result).toEqual({ ok: false, reason: "NOT_SWISS" });
  });
});
