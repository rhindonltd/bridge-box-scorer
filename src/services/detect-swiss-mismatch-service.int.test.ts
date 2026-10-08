// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import type { BoardOutcome } from "@/model/score";

// The detection service reads standings via the leaderboard, which needs the
// game's scoring type from the game-index. A Swiss + MP game classifies as
// SWISS_PAIRS_VP, so leaderboard lines carry totalVP.
vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(async () => ({
    gameId: "g",
    gameType: "PAIRS",
    scoringType: "MP",
  })),
}));

let tmpDir: string;
let gameId: string;

describe("detectSectionMismatches (§3.5 detection)", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "swiss-mismatch-"));
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

  /** Create a 3-table (6-pair) Swiss MP section with round 1 positional. */
  async function setup(boardsPerRound = 2, totalRounds = 4) {
    const { createGameDb } = await import("@/db/games/actions/create-game");
    const { setSectionMovement } = await import(
      "@/db/games/actions/set-section-movement"
    );
    const { materializeSwissRound } = await import(
      "@/services/materialize-swiss-round"
    );

    await createGameDb(gameId, 3);
    await setSectionMovement(gameId, "A", {
      source: "SWISS",
      swiss: { tables: 3, rounds: totalRounds, boardsPerRound },
    });

    // Round 1 positional: T1 1v4, T2 2v5, T3 3v6.
    await materializeSwissRound(gameId, "A", 3, 1, boardsPerRound, [
      { tableNumber: 1, ns: 1, ew: 4 },
      { tableNumber: 2, ns: 2, ew: 5 },
      { tableNumber: 3, ns: 3, ew: 6 },
    ], null);
  }

  /** Materialize a round-2 seating verbatim (the "committed" draw). */
  async function materializeRound2(
    seating: { tableNumber: number; ns: number; ew: number }[],
  ) {
    const { materializeSwissRound } = await import(
      "@/services/materialize-swiss-round"
    );
    await materializeSwissRound(gameId, "A", 3, 2, 2, seating, null);
  }

  /** Set a specific result on one table's boards for a round. */
  async function setResult(
    round: number,
    table: number,
    result: BoardOutcome,
  ) {
    const games = await import("@/db/games");
    const { boards } = await import("@/db/games/tables/boards");
    const { and, eq } = await import("drizzle-orm");
    const db = (await games.getDb(gameId))!;
    await db
      .update(boards)
      .set({ confirmedResult: result, status: "CONFIRMED" })
      .where(
        and(eq(boards.roundNumber, round), eq(boards.tableNumber, table)),
      );
  }

  it("returns no candidates when the committed round matches the correct draw", async () => {
    await setup();
    // Round 1 all level → everyone 50% → VP ties; standings order 1..6.
    await setResult(1, 1, "3NTN=");
    await setResult(1, 2, "3NTN=");
    await setResult(1, 3, "3NTN=");

    // Correct draw for standings [1,2,3,4,5,6] with 1v4,2v5,3v6 already played
    // is repeat-avoiding; whatever it is, materialize EXACTLY that by drawing.
    const { previewNextSwissRound } = await import(
      "@/services/draw-swiss-round-service"
    );
    const preview = await previewNextSwissRound(gameId, "A");
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    await materializeRound2(preview.seating);
    await setResult(2, 1, "3NTN=");
    await setResult(2, 2, "3NTN=");
    await setResult(2, 3, "3NTN=");

    const { detectSectionMismatches } = await import(
      "@/services/detect-swiss-mismatch-service"
    );
    const candidates = await detectSectionMismatches(gameId, "A");
    expect(candidates).toEqual([]);
  });

  it("flags a candidate when a committed round differs from the corrected draw by > 5 VP", async () => {
    await setup();

    // Round 1 (None vul): T1 makes 6NT (+990, tops), T2 makes 3NT (+400, mid),
    // T3 makes 1NT (+90, floor). This yields VP totals (decoded to stable pair
    // ids): pair1=20, pair2=10, pair3=0, pair4=0, pair5=10, pair6=20.
    await setResult(1, 1, "6NTN=");
    await setResult(1, 2, "3NTN=");
    await setResult(1, 3, "1NTN=");

    // The CORRECT round-2 draw from those standings is 1v6, 2v4, 3v5. We instead
    // commit a WRONG seating — 1v3, 2v4, 5v6 — simulating a draw that no longer
    // matches the (retroactively) corrected standings: pair 1 now plays pair 3
    // (0 VP) when it should play pair 6 (20 VP), a 20 VP gap.
    await materializeRound2([
      { tableNumber: 1, ns: 1, ew: 3 },
      { tableNumber: 2, ns: 2, ew: 4 },
      { tableNumber: 3, ns: 5, ew: 6 },
    ]);
    await setResult(2, 1, "3NTN=");
    await setResult(2, 2, "3NTN=");
    await setResult(2, 3, "3NTN=");

    const { detectSectionMismatches } = await import(
      "@/services/detect-swiss-mismatch-service"
    );
    const candidates = await detectSectionMismatches(gameId, "A");

    expect(candidates.length).toBeGreaterThan(0);

    // Pair 1 is a clear candidate: actual opp 3 (0 VP) vs correct opp 6 (20 VP).
    const p1 = candidates.find((c) => c.mismatchedId === 1);
    expect(p1).toBeDefined();
    expect(p1!.participantKind).toBe("PAIR");
    expect(p1!.section).toBe("A");
    expect(p1!.roundNumber).toBe(2);
    expect(p1!.actualOpponent).toBe(3);
    expect(p1!.correctOpponent).toBe(6);
    // VP are CURRENT totals (both rounds): pair 3 trails pair 6 by 20.
    expect(p1!.correctOpponentVp - p1!.actualOpponentVp).toBe(20);
    expect(p1!.direction).toBe("LOWER"); // actual opp trails the correct one
    // The ruling location is resolved for the markMismatch emit: pair 1 sat NS
    // at table 1; round 2 (boardsPerRound 2) → boards 3-4.
    expect(p1!.tableNumber).toBe(1);
    expect(p1!.side).toBe("NS");
    expect(p1!.boardNumber).toBe(3);

    // Every candidate is well-formed and over the threshold.
    for (const c of candidates) {
      expect(c.actualOpponent).not.toBe(c.correctOpponent);
      expect(
        Math.abs(c.actualOpponentVp - c.correctOpponentVp),
      ).toBeGreaterThan(5);
    }
  });

  it("skips a round already carrying a mismatch ruling", async () => {
    await setup();
    await setResult(1, 1, "6NTN=");
    await setResult(1, 2, "3NTN=");
    await setResult(1, 3, "1NTN=");
    await materializeRound2([
      { tableNumber: 1, ns: 1, ew: 6 },
      { tableNumber: 2, ns: 2, ew: 3 },
      { tableNumber: 3, ns: 4, ew: 5 },
    ]);
    await setResult(2, 1, "3NTN=");
    await setResult(2, 2, "3NTN=");
    await setResult(2, 3, "3NTN=");

    // Stamp a MISMATCH ruling on round 2 → detection must skip the round.
    const games = await import("@/db/games");
    const { boards } = await import("@/db/games/tables/boards");
    const { eq } = await import("drizzle-orm");
    const db = (await games.getDb(gameId))!;
    await db
      .update(boards)
      .set({ status: "MISMATCH", matchRuling: "MM:NS:HIGHER:NOT" })
      .where(eq(boards.roundNumber, 2));

    const { detectSectionMismatches } = await import(
      "@/services/detect-swiss-mismatch-service"
    );
    const candidates = await detectSectionMismatches(gameId, "A");
    expect(candidates).toEqual([]);
  });
});
