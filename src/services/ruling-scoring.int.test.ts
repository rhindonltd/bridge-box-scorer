// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

/**
 * End-to-end proof that a match-level director ruling, written onto the
 * first-class `matches.ruling` by the ruling writers, flows through the teams
 * VP scorer to the leaderboard. Covers the home-relative translation the
 * writers do when the director acts from the OPPONENT (higher) table.
 *
 * A real Swiss Teams round is materialised (so the match rows carry the correct
 * `home` = lower-table team), results are entered, then a ruling is applied via
 * `voidTeamsMatch` / `markMismatch` and the resulting leaderboard VP checked.
 */
vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(async () => ({
    gameId: "g",
    gameType: "TEAMS",
    scoringType: "IMP_VP",
    selectedMovement: JSON.stringify({
      source: "SWISS_TEAMS",
      swissTeams: { teams: 2, rounds: 3, boardsPerRound: 1 },
    }),
  })),
}));

let tmpDir: string;
let gameId: string;

describe("match-level rulings flow from matches.ruling to the leaderboard", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ruling-scoring-"));
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

  /** Materialise a 2-team, 1-board round (teams 1 v 2) and enter both rooms. */
  async function setupTeamsRound() {
    const { createGameDb } = await import("@/db/games/actions/create-game");
    const { setSectionMovement } = await import(
      "@/db/games/actions/set-section-movement"
    );
    const { materializeSwissTeamsRound } = await import(
      "@/services/materialize-swiss-teams-round"
    );
    const games = await import("@/db/games");

    await createGameDb(gameId, 2);
    await setSectionMovement(gameId, "A", {
      source: "SWISS_TEAMS",
      swissTeams: { teams: 2, rounds: 3, boardsPerRound: 1 },
    });
    await materializeSwissTeamsRound(gameId, "A", 1, 1, 3, [{ a: 1, b: 2 }], null, null);

    const db = (await games.getDb(gameId))!;
    const { boards } = await import("@/db/games/tables/boards");
    const { and, eq } = await import("drizzle-orm");
    // Open room (team 1, table 1): 3NT+1 = +430. Closed room (team 2, table 2):
    // 3NT= = +400. Team 1 wins by 1 IMP → tops the VP.
    const setResult = async (table: number, result: string) =>
      db
        .update(boards)
        .set({ confirmedResult: result as never, status: "CONFIRMED" })
        .where(
          and(
            eq(boards.section, "A"),
            eq(boards.tableNumber, table),
            eq(boards.boardNumber, 1),
          ),
        );
    await setResult(1, "3NTN+1");
    await setResult(2, "3NTN=");
    return db;
  }

  /** The two teams' round-1 VP from the live leaderboard. */
  async function teamVp() {
    const { computeLeaderboard } = await import("./leaderboard-service");
    const games = await import("@/db/games");
    const db = (await games.getDb(gameId))!;
    const lb = await computeLeaderboard(db, gameId);
    const vp = (id: string) =>
      (lb.overallScore.lines as { teamId: string; totalVP: number }[]).find(
        (l) => l.teamId === id,
      )?.totalVP ?? null;
    return { team1: vp("A1NS"), team2: vp("A2NS") };
  }

  it("a §3.3.6.1 void (acted from the home table) credits both teams 40%", async () => {
    await setupTeamsRound();
    const { voidTeamsMatch } = await import(
      "@/db/games/actions/set-board-result"
    );
    const games = await import("@/db/games");
    const db = (await games.getDb(gameId))!;

    // Act from table 1 (team 1's home = the match's home side).
    await voidTeamsMatch(db, { roundNumber: 1, tableNumber: 1 }, "VOID:SEATING_STANDARD");

    const { team1, team2 } = await teamVp();
    // Flat 40% of the 20-VP pool → 8 each.
    expect(team1).toBe(8);
    expect(team2).toBe(8);
  });

  it("a §3.5 mismatch acted from the OPPONENT table flips to the right side", async () => {
    await setupTeamsRound();
    const { markMismatch } = await import("@/db/games/actions/set-board-result");
    const games = await import("@/db/games");
    const db = (await games.getDb(gameId))!;

    const base = await teamVp();
    // Team 1 (home) won the board, so it has the higher VP.
    expect(base.team1!).toBeGreaterThan(base.team2!);

    // The director acts from table 2 (team 2's home = the OPPONENT room) and
    // rules its own NS side (team 2) mismatched: LOWER + own fault docks it.
    // The writer must store this home-relative (side EW, since table 2 is the
    // opponent of the match whose home is team 1), so ONLY team 2 moves.
    await markMismatch(
      db,
      { roundNumber: 1, tableNumber: 2 },
      "MM:NS:LOWER:OWN",
    );

    const ruled = await teamVp();
    // Team 1 (home, not the mismatched side) is untouched.
    expect(ruled.team1).toBe(base.team1);
    // Team 2 (the mismatched side) is docked below its actual VP.
    expect(ruled.team2!).toBeLessThan(base.team2!);
  });
});
