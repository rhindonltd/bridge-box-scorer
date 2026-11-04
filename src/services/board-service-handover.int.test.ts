// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import type { BoardOutcome } from "@/model/score";
import { withFixtureMatchId, seedFixtureMatch } from "@/mocks/fixtures/db-rows";

/**
 * Integration coverage for the traveller's PER-BOARD occupant name resolution
 * on a §2.4.7 handover seat, against a real migrated per-game SQLite file.
 *
 * After a handover the seat A1NS holds TWO occupancies over disjoint board
 * sets: the stand-in over the boards it played, the real pair over the rest.
 * `getBoardInstances` must label each board's row with whoever actually HELD
 * that board — the stand-in's names on its boards, the real pair's on theirs —
 * rather than one pair winning the whole seat (the old anchor-keyed lookup's
 * last-writer-wins collision).
 */
let tmpDir: string;
let gameId: string;

describe("getBoardInstances per-board names (handover)", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "board-handover-"));
    process.env.DATABASE_GAMES_URL = tmpDir;
    gameId = `game-${Math.random().toString(16).slice(2)}`;
    vi.resetModules();
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
    vi.resetModules();
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

  /** Seat a pair at a seat over an explicit board set (null = whole seat). */
  async function seatPair(
    db: any,
    seat: string,
    boards: number[] | null,
    standing: "ACTIVE" | "WITHOUT_STANDING" | "LATE",
    firstName: string,
    lastName: string,
  ): Promise<number> {
    const { players } = await import("@/db/games/tables/players");
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const p1 = db
      .insert(players)
      .values({ firstName, lastName: `${lastName}1` })
      .returning()
      .get();
    const p2 = db
      .insert(players)
      .values({ firstName, lastName: `${lastName}2` })
      .returning()
      .get();
    const row = db
      .insert(seatOccupancy)
      .values({
        seat,
        anchorId: seat,
        boards,
        player1: p1.id,
        player2: p2.id,
        secretKey: `${seat}-${standing}`,
        standing,
      })
      .returning()
      .get();
    return row.id;
  }

  /** Lay the A1 table's board rows (A1NS vs A1EW) for the given boards. */
  async function layBoards(db: any, boardNumbers: number[]) {
    const { boards } = await import("@/db/games/tables/boards");
    const rows = boardNumbers.map((boardNumber) => ({
      section: "A",
      roundNumber: boardNumber,
      tableNumber: 1,
      boardNumber,
      ns: "A1NS",
      ew: "A1EW",
      confirmedResult: "3NTN=" as BoardOutcome,
      status: "CONFIRMED" as const,
    }));
    db.insert(boards).values(rows.map(withFixtureMatchId)).run();
  }

  it("labels each board with the occupant that held it", async () => {
    const db = await setup();
    // Seat A1NS is a handover: the stand-in played boards 1-2, the real pair
    // took over for boards 3-4. A1EW is an ordinary whole-seat opponent.
    await seatPair(db, "A1NS", [1, 2], "WITHOUT_STANDING", "Stand", "In");
    await seatPair(db, "A1NS", [3, 4], "LATE", "Real", "Pair");
    await seatPair(db, "A1EW", null, "ACTIVE", "Opp", "Onent");
    await layBoards(db, [1, 2, 3, 4]);

    const { getBoardInstances } = await import("./board-service");

    // A board the STAND-IN played shows the stand-in's names on NS.
    const board2 = (await getBoardInstances(db, 2))[0];
    expect(board2.participants.type).toBe("PAIRS");
    if (board2.participants.type === "PAIRS") {
      expect(board2.participants.nsNames).toBe("Stand In1 & Stand In2");
      expect(board2.participants.ewNames).toBe("Opp Onent1 & Opp Onent2");
    }

    // A board the REAL PAIR played shows the real pair's names on NS.
    const board3 = (await getBoardInstances(db, 3))[0];
    if (board3.participants.type === "PAIRS") {
      expect(board3.participants.nsNames).toBe("Real Pair1 & Real Pair2");
      expect(board3.participants.ewNames).toBe("Opp Onent1 & Opp Onent2");
    }
  });

  it("labels a whole-seat (single occupancy) pair on every board", async () => {
    const db = await setup();
    await seatPair(db, "A1NS", null, "ACTIVE", "Home", "Pair");
    await seatPair(db, "A1EW", null, "ACTIVE", "Away", "Pair");
    await layBoards(db, [1, 2]);

    const { getBoardInstances } = await import("./board-service");

    for (const boardNumber of [1, 2]) {
      const row = (await getBoardInstances(db, boardNumber))[0];
      if (row.participants.type === "PAIRS") {
        expect(row.participants.nsNames).toBe("Home Pair1 & Home Pair2");
        expect(row.participants.ewNames).toBe("Away Pair1 & Away Pair2");
      }
    }
  });
});
