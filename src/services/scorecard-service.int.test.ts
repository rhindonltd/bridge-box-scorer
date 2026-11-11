// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import type { BoardOutcome } from "@/model/score";
import { withFixtureMatchId, seedFixtureMatch } from "@/mocks/fixtures/db-rows";

// The game-index row only supplies the game type, scoring type, format and the
// combined-ranking setting; mock it so each test can pick them.
const mockGame = vi.hoisted(() => ({
  current: {
    gameId: "g",
    gameType: "PAIRS",
    scoringType: "MP",
    eventFormat: "STANDARD",
    combinedRanking: true,
  } as Record<string, unknown>,
}));
vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(async () => mockGame.current),
}));

let tmpDir: string;
let gameId: string;

describe("buildPairScorecard (real scoring)", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "scorecard-"));
    process.env.DATABASE_GAMES_URL = tmpDir;
    gameId = `game-${Math.random().toString(16).slice(2)}`;
    mockGame.current = {
      gameId,
      gameType: "PAIRS",
      scoringType: "MP",
      eventFormat: "STANDARD",
      combinedRanking: true,
    };
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
    seedFixtureMatch(db);
    return db;
  }

  /** Seat an NS and an EW pair at a section's table (Mitchell: id = seat). */
  async function seatTable(db: any, section: string, table: number) {
    const { players } = await import("@/db/games/tables/players");
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    for (const dir of ["NS", "EW"] as const) {
      const seat = `${section}${table}${dir}`;
      const p1 = db
        .insert(players)
        .values({ firstName: `${seat}a`, lastName: "x" })
        .returning()
        .get();
      const p2 = db
        .insert(players)
        .values({ firstName: `${seat}b`, lastName: "y" })
        .returning()
        .get();
      db.insert(seatOccupancy)
        .values({
          seat,
          boards: null,
          player1: p1.id,
          player2: p2.id,
          secretKey: seat,
        })
        .run();
    }
  }

  async function addSections(db: any, letters: string[]) {
    const { sections } = await import("@/db/games/tables/sections");
    // A new game already has section A; add any others.
    letters.forEach((section, i) =>
      db
        .insert(sections)
        .values({ section, label: section, tables: 2, ordinal: i })
        .onConflictDoNothing()
        .run(),
    );
  }

  async function addResult(
    db: any,
    section: string,
    table: number,
    boardNumber: number,
    result: BoardOutcome | null,
  ) {
    const { boards } = await import("@/db/games/tables/boards");
    db.insert(boards)
      .values(
        withFixtureMatchId({
          section,
          roundNumber: 1,
          tableNumber: table,
          boardNumber,
          ns: `${section}${table}NS`,
          ew: `${section}${table}EW`,
          confirmedResult: result,
          status: result ? ("CONFIRMED" as const) : ("NOT_PLAYED" as const),
        }),
      )
      .run();
  }

  async function scorecard(db: any, seat: string) {
    const { buildPairScorecard } = await import("./scorecard-service");
    return buildPairScorecard(db, gameId, seat);
  }

  it("lists each board the pair played with its raw score and matchpoints", async () => {
    const db = await setup();
    await seatTable(db, "A", 1);
    await seatTable(db, "A", 2);
    // Board 1: table 1 makes an overtrick (430) against table 2's 400.
    await addResult(db, "A", 1, 1, "3NTN+1");
    await addResult(db, "A", 2, 1, "3NTN=");
    // Board 2: table 1 goes down; table 2 passes it out (0).
    await addResult(db, "A", 1, 2, "4SN-1");
    await addResult(db, "A", 2, 2, "PO");

    const ns = await scorecard(db, "A1NS");
    expect(ns).not.toBeNull();
    expect(ns!.pairId).toBe("A1NS");
    expect(ns!.scoring).toBe("MP");
    expect(ns!.roundVps).toBeNull();
    expect(ns!.boards.map((b) => b.boardNumber)).toEqual([1, 2]);

    const [b1, b2] = ns!.boards;
    expect(b1).toMatchObject({
      roundNumber: 1,
      side: "NS",
      opponentId: "A1EW",
      outcome: "3NTN+1",
      score: 430,
      matchpoints: { value: 2, max: 2 },
    });
    expect(b2.outcome).toBe("4SN-1");
    expect(b2.score).toBeLessThan(0);
    expect(b2.matchpoints).toEqual({ value: 0, max: 2 });

    // The EW pair sees the same board from its own side.
    const ew = await scorecard(db, "A1EW");
    expect(ew!.boards[0]).toMatchObject({
      side: "EW",
      opponentId: "A1NS",
      score: -430,
      matchpoints: { value: 0, max: 2 },
    });
  });

  it("skips boards the pair has no result on yet", async () => {
    const db = await setup();
    await seatTable(db, "A", 1);
    await seatTable(db, "A", 2);
    await addResult(db, "A", 1, 1, "3NTN=");
    await addResult(db, "A", 2, 1, "3NTN=");
    await addResult(db, "A", 1, 2, null);

    const card = await scorecard(db, "A1NS");
    expect(card!.boards.map((b) => b.boardNumber)).toEqual([1]);
  });

  it("carries IMPs for an IMP-scored pairs game", async () => {
    mockGame.current = { ...mockGame.current, scoringType: "XIMP" };
    const db = await setup();
    await seatTable(db, "A", 1);
    await seatTable(db, "A", 2);
    await addResult(db, "A", 1, 1, "3NTN+1");
    await addResult(db, "A", 2, 1, "3NTN=");

    const card = await scorecard(db, "A1NS");
    expect(card!.scoring).toBe("XIMP");
    expect(card!.boards[0].crossImps).toBeGreaterThan(0);
    expect(card!.boards[0].matchpoints).toBeUndefined();
  });

  it("scores against the pair's own section when sections are ranked separately", async () => {
    mockGame.current = { ...mockGame.current, combinedRanking: false };
    const db = await setup();
    await addSections(db, ["A", "B"]);
    await seatTable(db, "A", 1);
    await seatTable(db, "A", 2);
    await seatTable(db, "B", 1);
    await addResult(db, "A", 1, 1, "3NTN+1"); // 430
    await addResult(db, "A", 2, 1, "3NTN="); // 400
    await addResult(db, "B", 1, 1, "6NTN="); // 990 — section B only

    const card = await scorecard(db, "A1NS");
    // Only section A's two results count: a top on a 2-line board.
    expect(card!.boards[0].matchpoints).toEqual({ value: 2, max: 2 });
  });

  it("scores against every section when results are combined", async () => {
    const db = await setup();
    await addSections(db, ["A", "B"]);
    await seatTable(db, "A", 1);
    await seatTable(db, "A", 2);
    await seatTable(db, "B", 1);
    await addResult(db, "A", 1, 1, "3NTN+1"); // 430
    await addResult(db, "A", 2, 1, "3NTN="); // 400
    await addResult(db, "B", 1, 1, "6NTN="); // 990

    const card = await scorecard(db, "A1NS");
    // Three results: beats 400, loses to 990 → 2 of a 4 top.
    expect(card!.boards[0].matchpoints).toEqual({ value: 2, max: 4 });
  });

  it("is null for a teams game", async () => {
    mockGame.current = { ...mockGame.current, gameType: "TEAMS" };
    const db = await setup();
    await seatTable(db, "A", 1);
    expect(await scorecard(db, "A1NS")).toBeNull();
  });

  it("is null for a seat nobody holds", async () => {
    const db = await setup();
    expect(await scorecard(db, "A9NS")).toBeNull();
  });
});
