// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import type { BoardOutcome } from "@/model/score";

// A Teams Round Robin game: the game-index lookup supplies the TEAMS game type
// and a ROUND_ROBIN_TEAMS movement selection. The leaderboard service must
// route this to the SAME teams-VP scorer Swiss Teams uses — round robin differs
// only in how the schedule is produced, not how it is scored.
vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(async () => ({
    gameId: "g",
    gameType: "TEAMS",
    scoringType: "IMP_VP",
    selectedMovement: JSON.stringify({
      source: "ROUND_ROBIN_TEAMS",
      roundRobinTeams: { teams: 2, rounds: 1, boardsPerRound: 1 },
    }),
  })),
}));

let tmpDir: string;
let gameId: string;

describe("Teams Round Robin leaderboard (real scoring, shared teams-VP path)", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "leaderboard-rr-teams-"));
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

  async function setup() {
    const games = await import("@/db/games");
    const create = await import("@/db/games/actions/create-game");
    await create.createGameDb(gameId);
    const db = await games.getDb(gameId);
    if (!db) throw new Error("db not created");
    return db;
  }

  async function seatPair(
    db: any,
    seat: string,
    first1: string,
    first2: string,
  ) {
    const { players } = await import("@/db/games/tables/players");
    const { participants } = await import("@/db/games/tables/participants");
    const p1 = db
      .insert(players)
      .values({ firstName: first1, lastName: "x" })
      .returning()
      .get();
    const p2 = db
      .insert(players)
      .values({ firstName: first2, lastName: "y" })
      .returning()
      .get();
    db.insert(participants)
      .values({
        initialSeat: seat,
        player1: p1.id,
        player2: p2.id,
        secretKey: seat,
      })
      .run();
  }

  it("ranks teams by Victory Points via the shared two-table match comparison", async () => {
    const db = await setup();
    const { boards } = await import("@/db/games/tables/boards");
    const { computeLeaderboard } = await import("./leaderboard-service");

    // Same open/closed-room layout as Swiss Teams (round robin reuses it).
    await seatPair(db, "A1NS", "T1", "T1b");
    await seatPair(db, "A1EW", "T1away", "T1awayb");
    await seatPair(db, "A2NS", "T2", "T2b");
    await seatPair(db, "A2EW", "T2away", "T2awayb");

    // Open room at team 1's home table: team 1 (NS) makes 3NT+1 = +430.
    // Closed room at team 2's home table: team 2 (NS) makes 3NT= = +400.
    // Team 1 net +30 -> team 1 wins the match.
    db.insert(boards)
      .values([
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
      ])
      .run();

    const result = await computeLeaderboard(db, gameId);

    // Routed through the teams-VP scorer (same result shape as Swiss Teams).
    expect(result.type).toBe("TEAM_SWISS_VP");
    expect(result.participants.map((p) => p.id).sort()).toEqual([
      "A1NS",
      "A2NS",
    ]);
    const lines = result.overallScore.lines as {
      teamId: string;
      totalVP: number;
    }[];
    expect(lines[0].teamId).toBe("A1NS");
    expect(lines[0].totalVP).toBeGreaterThan(10);
    const total = lines[0].totalVP + lines[1].totalVP;
    expect(Math.round(total * 100) / 100).toBe(20);
  });
});
