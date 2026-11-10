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
    const { setSectionMovement } =
      await import("@/db/games/actions/set-section-movement");
    const { materializeSwissRound } =
      await import("@/services/materialize-swiss-round");

    await createGameDb(gameId, 3);
    await setSectionMovement(gameId, "A", {
      source: "SWISS",
      swiss: { tables: 3, rounds: totalRounds, boardsPerRound },
    });

    // Round 1 positional: T1 1v4, T2 2v5, T3 3v6.
    await materializeSwissRound(
      gameId,
      "A",
      3,
      1,
      boardsPerRound,
      [
        { tableNumber: 1, ns: 1, ew: 4 },
        { tableNumber: 2, ns: 2, ew: 5 },
        { tableNumber: 3, ns: 3, ew: 6 },
      ],
      null,
    );
  }

  /** Materialize a round-2 seating verbatim (the "committed" draw). */
  async function materializeRound2(
    seating: { tableNumber: number; ns: number; ew: number }[],
  ) {
    const { materializeSwissRound } =
      await import("@/services/materialize-swiss-round");
    await materializeSwissRound(gameId, "A", 3, 2, 2, seating, null);
  }

  /** Set a specific result on one table's boards for a round. */
  async function setResult(round: number, table: number, result: BoardOutcome) {
    const games = await import("@/db/games");
    const { boards } = await import("@/db/games/tables/boards");
    const { and, eq } = await import("drizzle-orm");
    const db = (await games.getDb(gameId))!;
    await db
      .update(boards)
      .set({ confirmedResult: result, status: "CONFIRMED" })
      .where(and(eq(boards.roundNumber, round), eq(boards.tableNumber, table)));
  }

  it("returns no candidates when the committed round matches the correct draw", async () => {
    await setup();
    // Round 1 all level → everyone 50% → VP ties; standings order 1..6.
    await setResult(1, 1, "3NTN=");
    await setResult(1, 2, "3NTN=");
    await setResult(1, 3, "3NTN=");

    // Correct draw for standings [1,2,3,4,5,6] with 1v4,2v5,3v6 already played
    // is repeat-avoiding; whatever it is, materialize EXACTLY that by drawing.
    const { previewNextSwissRound } =
      await import("@/services/draw-swiss-round-service");
    const preview = await previewNextSwissRound(gameId, "A");
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    await materializeRound2(preview.seating);
    await setResult(2, 1, "3NTN=");
    await setResult(2, 2, "3NTN=");
    await setResult(2, 3, "3NTN=");

    const { detectSectionMismatches } =
      await import("@/services/detect-swiss-mismatch-service");
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

    const { detectSectionMismatches } =
      await import("@/services/detect-swiss-mismatch-service");
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

  it("a ruled pair is not listed again; the round's other candidates still are", async () => {
    await setup();
    // The same wrong round-2 draw as above: 1v3, 2v4, 5v6.
    await setResult(1, 1, "6NTN=");
    await setResult(1, 2, "3NTN=");
    await setResult(1, 3, "1NTN=");
    await materializeRound2([
      { tableNumber: 1, ns: 1, ew: 3 },
      { tableNumber: 2, ns: 2, ew: 4 },
      { tableNumber: 3, ns: 5, ew: 6 },
    ]);
    await setResult(2, 1, "3NTN=");
    await setResult(2, 2, "3NTN=");
    await setResult(2, 3, "3NTN=");

    const { detectSectionMismatches } =
      await import("@/services/detect-swiss-mismatch-service");
    const { markMismatch } =
      await import("@/db/games/actions/set-board-result");
    const { buildMismatch } = await import("@/model/swiss-mismatch");
    const games = await import("@/db/games");
    const db = (await games.getDb(gameId))!;

    const before = await detectSectionMismatches(gameId, "A");
    const ids = (cs: typeof before) => cs.map((c) => c.mismatchedId).sort();
    // Pair 1 and its own opponent, pair 3, are both candidates from table 1.
    expect(ids(before)).toEqual(expect.arrayContaining([1, 3]));

    // Rule pair 1 (as the review screen does): only pair 1 drops out.
    const p1 = before.find((c) => c.mismatchedId === 1)!;
    await markMismatch(
      db,
      { roundNumber: 2, tableNumber: p1.tableNumber, boardNumber: p1.boardNumber },
      buildMismatch({ side: p1.side, direction: p1.direction, fault: "NOT" }),
    );
    const afterOne = await detectSectionMismatches(gameId, "A");
    expect(ids(afterOne)).toEqual(ids(before).filter((id) => id !== 1));

    // Then its opponent at the same table: pair 1's ruling is kept, and now
    // both drop out while the rest of the round is still listed.
    const p3 = afterOne.find((c) => c.mismatchedId === 3)!;
    await markMismatch(
      db,
      { roundNumber: 2, tableNumber: p3.tableNumber, boardNumber: p3.boardNumber },
      buildMismatch({ side: p3.side, direction: p3.direction, fault: "OWN" }),
    );
    const afterBoth = await detectSectionMismatches(gameId, "A");
    expect(ids(afterBoth)).toEqual(
      ids(before).filter((id) => id !== 1 && id !== 3),
    );

    const { matches } = await import("@/db/games/tables/matches");
    const { and, eq } = await import("drizzle-orm");
    const [row] = await db
      .select({ ruling: matches.ruling })
      .from(matches)
      .where(and(eq(matches.roundNumber, 2), eq(matches.home, "A1")));
    const { parseMismatches } = await import("@/model/swiss-mismatch");
    expect(parseMismatches(row.ruling!).map((r) => r.side)).toEqual([
      "NS",
      "EW",
    ]);
  });
  describe("a stationary pair marked after a round was drawn", () => {
    /**
     * Commit the CORRECT round-2 draw for these round-1 results (1v6, 2v4,
     * 3v5 — see the test above) with no stationary pairs. Pair 6 starts East at
     * table 3 but plays at table 1 here. Returns that pair, to be marked
     * stationary afterwards. (Stationary only affects where a pair sits, so in
     * an ordinary round this cannot change who meets whom; the point is that
     * the replay uses the list the round was drawn under.)
     */
    async function drawRound2WithoutStationary() {
      await setup();
      await setResult(1, 1, "6NTN=");
      await setResult(1, 2, "3NTN=");
      await setResult(1, 3, "1NTN=");
      await materializeRound2([
        { tableNumber: 1, ns: 1, ew: 6 },
        { tableNumber: 2, ns: 2, ew: 4 },
        { tableNumber: 3, ns: 3, ew: 5 },
      ]);
      await setResult(2, 1, "3NTN=");
      await setResult(2, 2, "3NTN=");
      await setResult(2, 3, "3NTN=");
      return 6;
    }

    async function markStationary(
      pair: number,
      recordHistory: boolean,
    ): Promise<void> {
      const { setSectionMovement } =
        await import("@/db/games/actions/set-section-movement");
      const { getSectionMovement } =
        await import("@/db/games/queries/get-section-movement");
      const { withStationaryHistory } =
        await import("@/model/selected-movement");
      const games = await import("@/db/games");
      const db = (await games.getDb(gameId))!;
      const previous = await getSectionMovement(db, "A");
      const next = {
        source: "SWISS" as const,
        swiss: {
          tables: 3,
          rounds: 4,
          boardsPerRound: 2,
          stationaryPairs: [pair],
        },
      };
      // The save route stamps the history from the highest round drawn (2).
      await setSectionMovement(
        gameId,
        "A",
        recordHistory ? withStationaryHistory(previous, next, 2) : next,
      );
    }

    it("leaves the already-drawn round un-flagged when its stationary history is recorded", async () => {
      const pair = await drawRound2WithoutStationary();
      await markStationary(pair, true);
      const { detectSectionMismatches } =
        await import("@/services/detect-swiss-mismatch-service");
      expect(await detectSectionMismatches(gameId, "A")).toEqual([]);
    });
  });
  describe("routing edges", () => {
    it("throws when the game db does not exist", async () => {
      const { detectSectionMismatches } =
        await import("@/services/detect-swiss-mismatch-service");
      await expect(detectSectionMismatches("no-such-game", "A")).rejects.toThrow(
        "Game db does not exist",
      );
    });
    it("returns nothing for a section with no movement", async () => {
      const { createGameDb } = await import("@/db/games/actions/create-game");
      await createGameDb(gameId, 3);
      const { detectSectionMismatches } =
        await import("@/services/detect-swiss-mismatch-service");
      expect(await detectSectionMismatches(gameId, "A")).toEqual([]);
    });
    it("returns nothing for a non-Swiss movement", async () => {
      const { createGameDb } = await import("@/db/games/actions/create-game");
      const { setSectionMovement } =
        await import("@/db/games/actions/set-section-movement");
      await createGameDb(gameId, 3);
      await setSectionMovement(gameId, "A", {
        source: "SPEC",
        specId: 1,
        boardsPerRound: 2,
      });
      const { detectSectionMismatches } =
        await import("@/services/detect-swiss-mismatch-service");
      expect(await detectSectionMismatches(gameId, "A")).toEqual([]);
    });
  });
  describe("odd-round plan", () => {
    async function runWith(swiss: Record<string, unknown>) {
      await setup();
      const { setSectionMovement } =
        await import("@/db/games/actions/set-section-movement");
      await setSectionMovement(gameId, "A", {
        source: "SWISS",
        swiss: { tables: 3, rounds: 4, boardsPerRound: 2, ...swiss },
      } as never);
      await setResult(1, 1, "6NTN=");
      await setResult(1, 2, "3NTN=");
      await setResult(1, 3, "1NTN=");
      await materializeRound2([
        { tableNumber: 1, ns: 1, ew: 3 },
        { tableNumber: 2, ns: 2, ew: 4 },
        { tableNumber: 3, ns: 5, ew: 6 },
      ]);
      const { detectSectionMismatches } =
        await import("@/services/detect-swiss-mismatch-service");
      return detectSectionMismatches(gameId, "A");
    }
    it("replays a planned HALF_MATCHES round", async () => {
      const planned = await runWith({
        oddHandling: "HALF_MATCHES",
        oddRoundPlan: ["BYE", "HALF_MATCHES", "BYE", "BYE"],
      });
      expect(Array.isArray(planned)).toBe(true);
    });
    it("replays a round under a stationary list recorded for it", async () => {
      const found = await runWith({ stationaryPairs: [6] });
      expect(Array.isArray(found)).toBe(true);
    });
  });
  it("ignores rulings whose participants cannot be decoded", async () => {
    await setup();
    await setResult(1, 1, "6NTN=");
    await setResult(1, 2, "3NTN=");
    await setResult(1, 3, "1NTN=");
    await materializeRound2([
      { tableNumber: 1, ns: 1, ew: 3 },
      { tableNumber: 2, ns: 2, ew: 4 },
      { tableNumber: 3, ns: 5, ew: 6 },
    ]);
    const { detectSectionMismatches } =
      await import("@/services/detect-swiss-mismatch-service");
    const before = await detectSectionMismatches(gameId, "A");
    const games = await import("@/db/games");
    const { matches } = await import("@/db/games/tables/matches");
    const db = (await games.getDb(gameId))!;
    db.insert(matches)
      .values([
        // EW ruling on a match with no opponent → no participant.
        {
          section: "A",
          roundNumber: 2,
          kind: "BYE",
          scoredAsUnit: false,
          home: "A9",
          opponent: null,
          boardStart: 3,
          boardEnd: 4,
          ruling: "MM:EW:HIGHER:OWN",
        },
        // NS ruling on an undecodable participant id.
        {
          section: "A",
          roundNumber: 2,
          kind: "PAIRS",
          scoredAsUnit: false,
          home: "garbage",
          opponent: "A9",
          boardStart: 3,
          boardEnd: 4,
          ruling: "MM:NS:HIGHER:OWN",
        },
      ])
      .run();
    expect(await detectSectionMismatches(gameId, "A")).toEqual(before);
  });
});
