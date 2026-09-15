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

describe("drawNextSwissRound", () => {
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

  it("rejects the draw while the current round is not fully scored", async () => {
    await setupSwiss();
    const { drawNextSwissRound } = await import(
      "@/services/draw-swiss-round-service"
    );

    const result = await drawNextSwissRound(gameId, "A");
    expect(result).toEqual({ ok: false, reason: "ROUND_INCOMPLETE" });
  });

  it("draws round 2 with no repeat opponents once round 1 is complete", async () => {
    await setupSwiss();
    await confirmRound(1);

    const { drawNextSwissRound } = await import(
      "@/services/draw-swiss-round-service"
    );
    const games = await import("@/db/games");
    const { boards } = await import("@/db/games/tables/boards");
    const { and, eq } = await import("drizzle-orm");

    const result = await drawNextSwissRound(gameId, "A");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.roundNumber).toBe(2);

    const db = (await games.getDb(gameId))!;
    const round2 = await db
      .select()
      .from(boards)
      .where(and(eq(boards.roundNumber, 2)));

    // Round 2 boards were materialized (boards 3..4 for boardsPerRound=2).
    expect(round2.length).toBeGreaterThan(0);
    expect(new Set(round2.map((r) => r.boardNumber))).toEqual(
      new Set([3, 4]),
    );

    // No round-2 matchup repeats a round-1 matchup. Round 1 pairings were
    // {A1NS,A1EW} and {A2NS,A2EW}; assert neither recurs.
    const round2Pairings = new Set(
      round2.map((r) => [r.ns, r.ew].sort().join("|")),
    );
    expect(round2Pairings.has(["A1NS", "A1EW"].sort().join("|"))).toBe(false);
    expect(round2Pairings.has(["A2NS", "A2EW"].sort().join("|"))).toBe(false);
  });

  it("rejects a draw once every round has been drawn", async () => {
    // A 1-round event: after round 1 there is nothing left to draw.
    await setupSwiss(2, 1);
    await confirmRound(1);

    const { drawNextSwissRound } = await import(
      "@/services/draw-swiss-round-service"
    );

    const result = await drawNextSwissRound(gameId, "A");
    expect(result).toEqual({ ok: false, reason: "EVENT_COMPLETE" });
  });

  it("rejects a draw for a non-Swiss section", async () => {
    const { createGameDb } = await import("@/db/games/actions/create-game");
    const { setSectionMovement } = await import(
      "@/db/games/actions/set-section-movement"
    );
    await createGameDb(gameId, 2);
    await setSectionMovement(gameId, "A", {
      source: "MITCHELL",
      mitchell: { tables: 2, rounds: 2, boardsPerRound: 2 },
    });

    const { drawNextSwissRound } = await import(
      "@/services/draw-swiss-round-service"
    );
    const result = await drawNextSwissRound(gameId, "A");
    expect(result).toEqual({ ok: false, reason: "NOT_SWISS" });
  });
});
