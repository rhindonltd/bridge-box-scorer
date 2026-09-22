// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import type { BoardOutcome } from "@/model/score";

// The draw reads standings via the team leaderboard, which needs the game type
// + movement from the game-index. Mock it as a Swiss Teams game.
vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(async () => ({
    gameId: "g",
    gameType: "TEAMS",
    scoringType: "IMP_VP",
    selectedMovement: JSON.stringify({
      source: "SWISS_TEAMS",
      swissTeams: { teams: 4, rounds: 4, boardsPerRound: 1 },
    }),
  })),
}));

let tmpDir: string;
let gameId: string;

describe("drawNextSwissTeamsRound", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "swiss-teams-draw-"));
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
   * Create a 4-table (= 4-team) Swiss Teams section, select the movement, and
   * materialize round 1 with matches {1,2} and {3,4}.
   */
  async function setup(boardsPerRound = 1, totalRounds = 4) {
    const { createGameDb } = await import("@/db/games/actions/create-game");
    const { setSectionMovement } = await import(
      "@/db/games/actions/set-section-movement"
    );
    const { materializeSwissTeamsRound } = await import(
      "@/services/materialize-swiss-teams-round"
    );

    await createGameDb(gameId, 4);
    await setSectionMovement(gameId, "A", {
      source: "SWISS_TEAMS",
      swissTeams: { teams: 4, rounds: totalRounds, boardsPerRound },
    });

    await materializeSwissTeamsRound(gameId, "A", 1, boardsPerRound, [
      { a: 1, b: 2 },
      { a: 3, b: 4 },
    ]);
  }

  /** Mark every round-`round` board CONFIRMED with a result. */
  async function confirmRound(round: number, result: BoardOutcome = "3NTN=") {
    const games = await import("@/db/games");
    const { boards } = await import("@/db/games/tables/boards");
    const { eq } = await import("drizzle-orm");
    const db = (await games.getDb(gameId))!;
    await db
      .update(boards)
      .set({ confirmedResult: result, status: "CONFIRMED" })
      .where(eq(boards.roundNumber, round));
  }

  it("rejects the draw while the current round is not fully scored", async () => {
    await setup();
    const { drawNextSwissTeamsRound } = await import(
      "@/services/draw-swiss-teams-round-service"
    );
    const result = await drawNextSwissTeamsRound(gameId, "A");
    expect(result).toEqual({ ok: false, reason: "ROUND_INCOMPLETE" });
  });

  it("draws round 2 with no repeat matches once round 1 is complete", async () => {
    await setup();
    await confirmRound(1);

    const { drawNextSwissTeamsRound } = await import(
      "@/services/draw-swiss-teams-round-service"
    );
    const games = await import("@/db/games");
    const { boards } = await import("@/db/games/tables/boards");
    const { eq } = await import("drizzle-orm");

    const result = await drawNextSwissTeamsRound(gameId, "A");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.roundNumber).toBe(2);

    const db = (await games.getDb(gameId))!;
    const round2 = await db
      .select()
      .from(boards)
      .where(eq(boards.roundNumber, 2));

    // Four tables materialized for round 2 (two matches, two tables each),
    // playing board 2.
    expect(new Set(round2.map((r) => r.tableNumber))).toEqual(
      new Set([1, 2, 3, 4]),
    );
    expect(new Set(round2.map((r) => r.boardNumber))).toEqual(new Set([2]));

    // Recover the round-2 matches from each home table's EW opponent seat and
    // assert neither round-1 match {1,2} or {3,4} recurs.
    const matchKeys = new Set(
      round2.map((r) => {
        const home = Number(/\d+/.exec(r.ns)![0]);
        const away = Number(/\d+/.exec(r.ew)![0]);
        return [home, away].sort((x, y) => x - y).join("-");
      }),
    );
    expect(matchKeys.has("1-2")).toBe(false);
    expect(matchKeys.has("3-4")).toBe(false);
  });

  it("rejects a draw once every round has been drawn", async () => {
    await setup(1, 1);
    await confirmRound(1);

    const { drawNextSwissTeamsRound } = await import(
      "@/services/draw-swiss-teams-round-service"
    );
    const result = await drawNextSwissTeamsRound(gameId, "A");
    expect(result).toEqual({ ok: false, reason: "EVENT_COMPLETE" });
  });

  it("rejects a draw for a non-Swiss-Teams section", async () => {
    const { createGameDb } = await import("@/db/games/actions/create-game");
    const { setSectionMovement } = await import(
      "@/db/games/actions/set-section-movement"
    );
    await createGameDb(gameId, 2);
    await setSectionMovement(gameId, "A", {
      source: "MITCHELL",
      mitchell: { tables: 2, rounds: 2, boardsPerRound: 2 },
    });

    const { drawNextSwissTeamsRound } = await import(
      "@/services/draw-swiss-teams-round-service"
    );
    const result = await drawNextSwissTeamsRound(gameId, "A");
    expect(result).toEqual({ ok: false, reason: "NOT_SWISS_TEAMS" });
  });
});
