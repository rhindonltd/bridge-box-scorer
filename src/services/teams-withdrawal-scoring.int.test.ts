// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import type { BoardOutcome } from "@/model/score";

/**
 * End-to-end proof of the EBU White Book §2.4.3–§2.4.6 whole-TEAM withdrawal in
 * a Round-Robin / Swiss TEAMS event: a withdrawn team's UNPLAYED match scores
 * as a §3.3.9 void — the withdrawing team below average (AVE−), its opponent
 * indemnified (AVE+) — WITHOUT persisting any ruling (the void is synthesised
 * in-memory at scoring time). A `REMOVE` withdrawal is additionally dropped from
 * the ranking (§2.4.9); a `PENALISED` one stays.
 *
 * A 4-team section plays two rounds (1 v 2 and 3 v 4 each round). Round 1 is
 * played in full; round 2 is left UNPLAYED (its match rows exist but carry no
 * board rows) and team 1 withdraws — so only team 1's round-2 match is voided,
 * while the 3 v 4 round-2 match (no withdrawer) stays a plain 0/0 neutral.
 */
vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(async () => ({
    gameId: "g",
    gameType: "TEAMS",
    scoringType: "IMP_VP",
    selectedMovement: JSON.stringify({
      source: "ROUND_ROBIN_TEAMS",
      roundRobinTeams: { teams: 4, rounds: 2, boardsPerRound: 2 },
    }),
  })),
}));

let tmpDir: string;
let gameId: string;

describe("whole-team withdrawal voids a team's unplayed teams matches", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "teams-withdrawal-"));
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
   * Build the 4-team, two-round scenario: round 1 (boards 1-2) played in both
   * matches, round 2 (boards 3-4) materialised as match rows but UNPLAYED.
   */
  async function setup() {
    const games = await import("@/db/games");
    const create = await import("@/db/games/actions/create-game");
    await create.createGameDb(gameId);
    const db = (await games.getDb(gameId))!;

    const { players } = await import("@/db/games/tables/players");
    const { participants } = await import("@/db/games/tables/participants");
    const { matches } = await import("@/db/games/tables/matches");
    const { boards } = await import("@/db/games/tables/boards");

    // Seat the four teams' home-NS + away-EW pairs (teams are keyed on the
    // home-NS seat, which is where a withdrawal's standing lives).
    const seat = (s: string) => {
      const p1 = db
        .insert(players)
        .values({ firstName: `${s}1`, lastName: "x" })
        .returning()
        .get();
      const p2 = db
        .insert(players)
        .values({ firstName: `${s}2`, lastName: "y" })
        .returning()
        .get();
      db.insert(participants)
        .values({
          initialSeat: s as `${string}${number}NS`,
          player1: p1.id,
          player2: p2.id,
          secretKey: s,
        })
        .run();
    };
    for (const t of [1, 2, 3, 4]) {
      seat(`A${t}NS`);
      seat(`A${t}EW`);
    }

    // Match rows: round 1 and round 2 both draw 1 v 2 and 3 v 4.
    const match = (
      id: number,
      round: number,
      home: string,
      opponent: string,
      boardStart: number,
      boardEnd: number,
    ) =>
      db
        .insert(matches)
        .values({
          id,
          section: "A",
          roundNumber: round,
          kind: "TEAMS",
          scoredAsUnit: true,
          home,
          opponent,
          vpPool: 20,
          boardStart,
          boardEnd,
        })
        .run();
    match(1, 1, "A1NS", "A2NS", 1, 2);
    match(2, 1, "A3NS", "A4NS", 1, 2);
    // Round 2 match rows exist but no board rows are seeded for them.
    match(3, 2, "A1NS", "A2NS", 3, 4);
    match(4, 2, "A3NS", "A4NS", 3, 4);

    // Round-1 board rows (both rooms of both matches), so round 1 is complete.
    const board = (
      matchId: number,
      table: number,
      board: number,
      ns: string,
      ew: string,
    ) =>
      db
        .insert(boards)
        .values({
          matchId,
          section: "A",
          roundNumber: 1,
          tableNumber: table,
          boardNumber: board,
          ns,
          ew,
          confirmedResult: "3NTN=" as BoardOutcome,
          status: "CONFIRMED" as const,
        })
        .run();
    for (const b of [1, 2]) {
      board(1, 1, b, "A1NS", "A2EW"); // match 1, team 1 home room
      board(1, 2, b, "A2NS", "A1EW"); // match 1, team 2 home room
      board(2, 3, b, "A3NS", "A4EW"); // match 2, team 3 home room
      board(2, 4, b, "A4NS", "A3EW"); // match 2, team 4 home room
    }
    return db;
  }

  /** The round-2 VP each team got + the ranked ids, from the live leaderboard. */
  async function round2Vp() {
    const { computeLeaderboard } = await import("./leaderboard-service");
    const games = await import("@/db/games");
    const db = (await games.getDb(gameId))!;
    const lb = await computeLeaderboard(db, gameId);
    const lines = lb.overallScore.lines as {
      teamId: string;
      vpByRound: Record<number, number>;
    }[];
    const r2 = (id: string) =>
      lines.find((l) => l.teamId === id)?.vpByRound?.[2] ?? null;
    return { r2, ids: lines.map((l) => l.teamId) };
  }

  it("credits the opponent AVE+ and the withdrawer AVE− on the unplayed round", async () => {
    await setup();
    const { withdrawParticipant } = await import(
      "@/db/games/actions/withdraw-participant"
    );
    // Team 1 (home of the round-2 1 v 2 match) withdraws, PENALISED so it stays
    // in the ranking and its round-2 void VP is observable.
    const updated = await withdrawParticipant(gameId, "A1NS", {
      standing: "WITHDRAWN",
      withdrawnInRound: 2,
      treatment: "PENALISED",
      finePercent: 0,
    });
    expect(updated).toBe(true);

    const { voidMatchVp } = await import("@/model/teams-match-void");
    const { r2, ids } = await round2Vp();

    // The §3.3.9 split over the 2 expected boards: home (withdrawer) AVE−,
    // opponent AVE+ — the exact values the void model yields.
    const expected = voidMatchVp("SHORT_OFFENDER_NS", 20, 2);
    expect(r2("A1NS")).toBe(expected.home);
    expect(r2("A2NS")).toBe(expected.opponent);
    // Opponent above the neutral 10, withdrawer below it.
    expect(r2("A2NS")!).toBeGreaterThan(10);
    expect(r2("A1NS")!).toBeLessThan(10);
    // The 3 v 4 match (no withdrawer) is an ordinary unplayed round: neutral.
    expect(r2("A3NS")).toBe(10);
    expect(r2("A4NS")).toBe(10);
    // PENALISED stays in the ranking.
    expect(ids).toContain("A1NS");
  });

  it("drops a REMOVE withdrawer from the ranking (opponent still indemnified)", async () => {
    await setup();
    const { withdrawParticipant } = await import(
      "@/db/games/actions/withdraw-participant"
    );
    await withdrawParticipant(gameId, "A1NS", {
      standing: "WITHDRAWN",
      withdrawnInRound: 2,
      treatment: "REMOVE",
    });

    const { voidMatchVp } = await import("@/model/teams-match-void");
    const { r2, ids } = await round2Vp();

    // REMOVE drops team 1 from the ranking entirely.
    expect(ids).not.toContain("A1NS");
    // But its opponent is still indemnified (AVE+) for the voided round.
    const expected = voidMatchVp("SHORT_OFFENDER_NS", 20, 2);
    expect(r2("A2NS")).toBe(expected.opponent);
  });
});
