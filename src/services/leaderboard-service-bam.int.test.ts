// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import type { BoardOutcome } from "@/model/score";

// A Board-a-Match teams game: the game-index lookup supplies the TEAMS game
// type, a BAM scoring type, and a SWISS_TEAMS movement so the leaderboard
// service classifies the game as TEAMS_BAM (barometer) and routes to the BAM
// scorer, resolving team participants from seating.
vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(async () => ({
    gameId: "g",
    gameType: "TEAMS",
    scoringType: "BAM",
    selectedMovement: JSON.stringify({
      source: "SWISS_TEAMS",
      swissTeams: { teams: 2, rounds: 3, boardsPerRound: 1 },
    }),
  })),
}));

let tmpDir: string;
let gameId: string;

describe("Board-a-Match teams leaderboard (real scoring)", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "leaderboard-bam-"));
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

  it("ranks teams by boards won and reports a TEAM_BAM barometer result", async () => {
    const db = await setup();
    const { boards } = await import("@/db/games/tables/boards");
    const { computeLeaderboard } = await import("./leaderboard-service");

    await seatPair(db, "A1NS", "T1", "T1b");
    await seatPair(db, "A1EW", "T1away", "T1awayb");
    await seatPair(db, "A2NS", "T2", "T2b");
    await seatPair(db, "A2EW", "T2away", "T2awayb");

    // Round 1, board 1 (None vul). Team 1 (home table 1) makes 4S= = 420;
    // team 2 (home table 2) makes 3NT= = 400. Team 1 outscores team 2 on the
    // board, so team 1 wins the board: 1 board won of 1 played; team 2 wins 0.
    db.insert(boards)
      .values([
        {
          section: "A",
          roundNumber: 1,
          tableNumber: 1,
          boardNumber: 1,
          ns: "A1NS",
          ew: "A2EW",
          confirmedResult: "4SN=" as BoardOutcome,
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

    expect(result.type).toBe("TEAM_BAM");
    const overall = result.overallScore as Extract<
      typeof result.overallScore,
      { type: "TEAM_BAM" }
    >;
    // Swiss Teams is a barometer movement -> per-round layout flag set.
    expect(overall.barometer).toBe(true);

    expect(result.participants.map((p) => p.id).sort()).toEqual([
      "A1NS",
      "A2NS",
    ]);

    const lines = overall.lines;
    expect(lines.length).toBe(2);
    // Team 1 won the only board; it ranks first.
    expect(lines[0].teamId).toBe("A1NS");
    expect(lines[0].totalWon).toBe(1);
    expect(lines[0].totalPlayed).toBe(1);
    // Team 2 lost the board.
    const t2 = lines.find((l) => l.teamId === "A2NS")!;
    expect(t2.totalWon).toBe(0);
    expect(t2.totalPlayed).toBe(1);
  });
});
