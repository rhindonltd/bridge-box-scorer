// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import type { BoardOutcome } from "@/model/score";

// A Swiss Teams game: the game-index lookup supplies the game type + the
// SWISS_TEAMS movement selection so the leaderboard service routes to the team
// VP scorer and resolves team participants from seating.
vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(async () => ({
    gameId: "g",
    gameType: "TEAMS",
    scoringType: "IMP",
    selectedMovement: JSON.stringify({
      source: "SWISS_TEAMS",
      swissTeams: { teams: 2, rounds: 3, boardsPerRound: 1 },
    }),
  })),
}));

let tmpDir: string;
let gameId: string;

describe("Swiss Teams leaderboard (real scoring)", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "leaderboard-teams-"));
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

  // Seat one pair (a section-qualified seat) with two named players.
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

  it("ranks teams by Victory Points from the two-table match comparison", async () => {
    const db = await setup();
    const { boards } = await import("@/db/games/tables/boards");
    const { computeLeaderboard } = await import("./leaderboard-service");

    // Two teams: team 1 at home table 1 (NS pair A1NS + away pair A1EW),
    // team 2 at home table 2 (NS pair A2NS + away pair A2EW).
    await seatPair(db, "A1NS", "T1", "T1b");
    await seatPair(db, "A1EW", "T1away", "T1awayb");
    await seatPair(db, "A2NS", "T2", "T2b");
    await seatPair(db, "A2EW", "T2away", "T2awayb");

    // Round 1, board 1 (None vul). Open room at team 1's home table 1:
    // team 1 (NS) makes 3NT+1 = +430; team 2's away pair (EW) defends.
    // Closed room at team 2's home table 2: team 2 (NS) makes 3NT= = +400.
    // Team 1 net = 430 - 400 = +30 -> 1 IMP to team 1 -> team 1 wins the match.
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

    expect(result.type).toBe("TEAM_SWISS_VP");
    // Two teams ranked; participants are teams (id = home NS seat).
    expect(result.overallScore.lines.length).toBe(2);
    expect(result.participants.map((p) => p.id).sort()).toEqual([
      "A1NS",
      "A2NS",
    ]);
    // Team 1 won the match, so it ranks first with more than half the pool.
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
