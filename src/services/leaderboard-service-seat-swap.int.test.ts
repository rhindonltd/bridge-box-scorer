// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import type { BoardOutcome } from "@/model/score";
import {
  withFixtureMatchId,
  seedFixtureMatch,
  seedFixtureTeamsMatch,
} from "@/mocks/fixtures/db-rows";

/**
 * A board the director marked "played the wrong way round" keeps its result but
 * is credited to the opposite pairs / teams. Real scoring against a real
 * per-game database: flagging a table must move the credit, and clearing the
 * flag must restore the original standings.
 */
const game = vi.hoisted(() => ({
  current: {} as Record<string, unknown>,
}));
vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(async () => game.current),
}));

const MITCHELL = JSON.stringify({
  source: "MITCHELL",
  mitchell: { tables: 3, rounds: 3, boardsPerRound: 2 },
});
const ROUND_ROBIN_TEAMS = JSON.stringify({
  source: "ROUND_ROBIN_TEAMS",
  roundRobinTeams: { teams: 2, rounds: 1, boardsPerRound: 1 },
});

let tmpDir: string;
let gameId: string;

describe("leaderboard credits a played-reversed board to the opposite side", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "leaderboard-swap-"));
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

  async function setup(config: Record<string, unknown>) {
    game.current = { gameId: "g", combinedRanking: true, ...config };
    const games = await import("@/db/games");
    const create = await import("@/db/games/actions/create-game");
    await create.createGameDb(gameId);
    const db = await games.getDb(gameId);
    if (!db) throw new Error("db not created");
    return db;
  }

  async function seat(db: any, seatId: string) {
    const { players } = await import("@/db/games/tables/players");
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const p1 = db
      .insert(players)
      .values({ firstName: `${seatId}a`, lastName: "x" })
      .returning()
      .get();
    const p2 = db
      .insert(players)
      .values({ firstName: `${seatId}b`, lastName: "y" })
      .returning()
      .get();
    db.insert(seatOccupancy)
      .values({
        seat: seatId,
        boards: null,
        player1: p1.id,
        player2: p2.id,
        secretKey: seatId,
      })
      .run();
  }

  async function setSwapped(
    db: any,
    tableNumber: number,
    swapped: boolean,
  ): Promise<void> {
    const { setBoardSeatsSwapped } = await import(
      "@/db/games/actions/set-board-result"
    );
    await setBoardSeatsSwapped(
      db,
      { roundNumber: 1, tableNumber, boardNumber: 1 },
      swapped,
    );
  }

  describe("pairs (two-winner Mitchell, matchpoints)", () => {
    async function seatAndScore(db: any) {
      const { boards } = await import("@/db/games/tables/boards");
      for (const t of [1, 2, 3]) {
        await seat(db, `A${t}NS`);
        await seat(db, `A${t}EW`);
      }
      seedFixtureMatch(db);
      // NS-hand scores: table 1 best, table 3 worst.
      const results: BoardOutcome[] = ["3NTN+1", "3NTN=", "3NTN-1"];
      db.insert(boards)
        .values(
          results.map((confirmedResult, i) =>
            withFixtureMatchId({
              section: "A",
              roundNumber: 1,
              tableNumber: i + 1,
              boardNumber: 1,
              ns: `A${i + 1}NS`,
              ew: `A${i + 1}EW`,
              confirmedResult,
              status: "CONFIRMED" as const,
            }),
          ),
        )
        .run();
    }

    async function mpByPair(db: any): Promise<Record<string, number>> {
      const { computeLeaderboard } = await import("./leaderboard-service");
      const result = await computeLeaderboard(db, gameId);
      const lines = result.overallScore.lines as {
        pairId: string;
        totalMP: number;
      }[];
      return Object.fromEntries(lines.map((l) => [l.pairId, l.totalMP]));
    }

    const config = {
      gameType: "PAIRS",
      scoringType: "MP",
      selectedMovement: MITCHELL,
    };

    it("exchanges the matchpoints of the two pairs at a flagged table only", async () => {
      const db = await setup(config);
      await seatAndScore(db);

      const before = await mpByPair(db);
      // Sanity: the worst NS-hand table gives its NS pair nothing and its EW
      // pair the top.
      expect(before.A3NS).toBeLessThan(before.A3EW);

      await setSwapped(db, 3, true);
      const after = await mpByPair(db);

      // Table 3's pairs trade credit; the board's own matchpoints are unchanged.
      expect(after.A3NS).toBe(before.A3EW);
      expect(after.A3EW).toBe(before.A3NS);
      // Every other table is untouched.
      for (const id of ["A1NS", "A1EW", "A2NS", "A2EW"]) {
        expect(after[id]).toBe(before[id]);
      }
    });

    it("restores the original standings when the flag is cleared", async () => {
      const db = await setup(config);
      await seatAndScore(db);
      const before = await mpByPair(db);

      await setSwapped(db, 3, true);
      await setSwapped(db, 3, false);

      expect(await mpByPair(db)).toEqual(before);
    });

    it("keeps each swapped pair in its own NS / EW ranking", async () => {
      const db = await setup(config);
      await seatAndScore(db);
      await setSwapped(db, 3, true);

      const { computeLeaderboard } = await import("./leaderboard-service");
      const result = await computeLeaderboard(db, gameId);
      const ns = result.directional!.ns.overallScore.lines as any[];
      const ew = result.directional!.ew.overallScore.lines as any[];

      expect(ns.map((l) => l.pairId).sort()).toEqual(["A1NS", "A2NS", "A3NS"]);
      expect(ew.map((l) => l.pairId).sort()).toEqual(["A1EW", "A2EW", "A3EW"]);
      // Table 3's NS pair now holds the EW side of the worst NS-hand result,
      // so it now leads the NS field.
      const a3ns = ns.find((l) => l.pairId === "A3NS");
      expect(a3ns.rank).toBe(1);
    });
  });

  describe("Swiss Pairs (matchpoint VP)", () => {
    async function seedRound(db: any) {
      const { materializeSwissRound } = await import(
        "@/services/materialize-swiss-round"
      );
      const { boards } = await import("@/db/games/tables/boards");
      const { eq } = await import("drizzle-orm");

      // Round-1 anchors: the seated set the Swiss draw ranks and re-pairs.
      for (const s of ["A1NS", "A2NS", "A1EW", "A2EW"]) await seat(db, s);
      // Round 1: T1 pair 1 (NS) v pair 3 (EW); T2 pair 2 (NS) v pair 4 (EW).
      await materializeSwissRound(
        gameId,
        "A",
        2,
        1,
        1,
        [
          { tableNumber: 1, ns: 1, ew: 3 },
          { tableNumber: 2, ns: 2, ew: 4 },
        ],
        null,
      );
      // Table 1 beats table 2 on the NS hand.
      for (const [tableNumber, result] of [
        [1, "3NTN+1"],
        [2, "3NTN-1"],
      ] as const) {
        await db
          .update(boards)
          .set({ confirmedResult: result as never, status: "CONFIRMED" })
          .where(eq(boards.tableNumber, tableNumber));
      }
    }

    async function vpByPair(db: any): Promise<Record<string, number>> {
      const { computeLeaderboard } = await import("./leaderboard-service");
      const result = await computeLeaderboard(db, gameId);
      const lines = result.overallScore.lines as {
        pairId: string;
        totalVP: number;
      }[];
      return Object.fromEntries(lines.map((l) => [l.pairId, l.totalVP]));
    }

    const config = {
      gameType: "PAIRS",
      scoringType: "MP",
      selectedMovement: JSON.stringify({
        source: "SWISS",
        swiss: { tables: 2, rounds: 3, boardsPerRound: 1 },
      }),
    };

    it("exchanges the two pairs' victory points at a flagged table only", async () => {
      const db = await setup(config);
      await seedRound(db);

      const before = await vpByPair(db);
      // Pair 1 beat pair 3 at table 1.
      expect(before.A1).toBeGreaterThan(before.A3);

      await setSwapped(db, 1, true);
      const after = await vpByPair(db);

      expect(after.A1).toBe(before.A3);
      expect(after.A3).toBe(before.A1);
      expect(after.A2).toBe(before.A2);
      expect(after.A4).toBe(before.A4);
    });

    it("restores the original standings when the flag is cleared", async () => {
      const db = await setup(config);
      await seedRound(db);
      const before = await vpByPair(db);

      await setSwapped(db, 1, true);
      await setSwapped(db, 1, false);

      expect(await vpByPair(db)).toEqual(before);
    });
  });

  describe("teams (Teams Round Robin, VP)", () => {
    async function seedMatch(db: any) {
      const { boards } = await import("@/db/games/tables/boards");
      seedFixtureTeamsMatch(db);
      for (const s of ["A1NS", "A1EW", "A2NS", "A2EW"]) await seat(db, s);
      // Open room (team 1 NS): +430. Closed room (team 2 NS): +400.
      // Team 1 nets +30, so it wins the match.
      db.insert(boards)
        .values(
          [
            {
              section: "A",
              roundNumber: 1,
              tableNumber: 1,
              boardNumber: 1,
              ns: "A1NS",
              ew: "A2EW",
              confirmedResult: "3NTN+1" as BoardOutcome,
              status: "CONFIRMED" as const,
            },
            {
              section: "A",
              roundNumber: 1,
              tableNumber: 2,
              boardNumber: 1,
              ns: "A2NS",
              ew: "A1EW",
              confirmedResult: "3NTN=" as BoardOutcome,
              status: "CONFIRMED" as const,
            },
          ].map(withFixtureMatchId),
        )
        .run();
    }

    async function vpByTeam(db: any): Promise<Record<string, number>> {
      const { computeLeaderboard } = await import("./leaderboard-service");
      const result = await computeLeaderboard(db, gameId);
      const lines = result.overallScore.lines as {
        teamId: string;
        totalVP: number;
      }[];
      return Object.fromEntries(lines.map((l) => [l.teamId, l.totalVP]));
    }

    const config = {
      gameType: "TEAMS",
      scoringType: "IMP_VP",
      selectedMovement: ROUND_ROBIN_TEAMS,
    };

    it("flips the match when the open room is played reversed", async () => {
      const db = await setup(config);
      await seedMatch(db);

      const before = await vpByTeam(db);
      expect(before.A1NS).toBeGreaterThan(before.A2NS);

      // Team 1 actually held the EW hands in the open room, so its +430 is
      // team 2's: the match swings to team 2.
      await setSwapped(db, 1, true);
      const after = await vpByTeam(db);

      expect(after.A2NS).toBeGreaterThan(after.A1NS);
      expect(Math.round((after.A1NS + after.A2NS) * 100) / 100).toBe(20);
    });

    it("restores the original result when the flag is cleared", async () => {
      const db = await setup(config);
      await seedMatch(db);
      const before = await vpByTeam(db);

      await setSwapped(db, 1, true);
      await setSwapped(db, 1, false);

      expect(await vpByTeam(db)).toEqual(before);
    });
  });
});
