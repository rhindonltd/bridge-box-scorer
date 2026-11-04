// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import type { BoardOutcome } from "@/model/score";
import { withFixtureMatchId, seedFixtureMatch } from "@/mocks/fixtures/db-rows";

/**
 * Integration coverage for the §2.4.7 stand-in → real-pair handover DB action,
 * against a real migrated per-game SQLite file.
 *
 * The core behaviour is that the boards-played split is DERIVED from the
 * entered results: the stand-in keeps the boards that already have a result;
 * the arriving real pair takes the rest. Plus the three guard rejections.
 */
let tmpDir: string;
let gameId: string;

describe("handoverSeat", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "handover-"));
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

  /** Seat the stand-in whole-seat at A1NS, returning its occupancy id. */
  async function seatStandIn(db: any): Promise<number> {
    const { players } = await import("@/db/games/tables/players");
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const p1 = db
      .insert(players)
      .values({ firstName: "Stand", lastName: "In1" })
      .returning()
      .get();
    const p2 = db
      .insert(players)
      .values({ firstName: "Stand", lastName: "In2" })
      .returning()
      .get();
    const row = db
      .insert(seatOccupancy)
      .values({
        seat: "A1NS",
        boards: null,
        player1: p1.id,
        player2: p2.id,
        secretKey: "standin-secret",
      })
      .returning()
      .get();
    return row.id;
  }

  /**
   * Lay down the seat's board rows. `withResult` is the subset of board numbers
   * that already carry a confirmed result; the rest are unplayed. The seat's
   * board id is "A1NS" (fixed-direction Mitchell → anchor == seat).
   */
  async function layBoards(
    db: any,
    boardNumbers: number[],
    withResult: number[],
  ) {
    const { boards } = await import("@/db/games/tables/boards");
    const resultSet = new Set(withResult);
    const rows = boardNumbers.map((boardNumber) => ({
      section: "A",
      roundNumber: boardNumber,
      tableNumber: 1,
      boardNumber,
      ns: "A1NS",
      ew: "A1EW",
      confirmedResult: resultSet.has(boardNumber)
        ? ("3NTN=" as BoardOutcome)
        : null,
      status: resultSet.has(boardNumber) ? ("CONFIRMED" as const) : null,
    }));
    db.insert(boards).values(rows.map(withFixtureMatchId)).run();
  }

  async function occupanciesForSeat(db: any) {
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const { eq } = await import("drizzle-orm");
    return db
      .select()
      .from(seatOccupancy)
      .where(eq(seatOccupancy.seat, "A1NS"))
      .all();
  }

  it("splits boards at the first one without a result", async () => {
    const db = await setup();
    const standInId = await seatStandIn(db);
    // Seat plays boards 1..4; boards 1 and 2 have been scored.
    await layBoards(db, [1, 2, 3, 4], [1, 2]);

    const { handoverSeat } = await import("./handover-seat");
    const result = await handoverSeat(gameId, {
      seat: "A1NS",
      realPair: {
        player1: { firstName: "Real", lastName: "One" },
        player2: { firstName: "Real", lastName: "Two" },
      },
      secretKey: "real-secret",
    });

    expect(result.ok).toBe(true);

    const occ = await occupanciesForSeat(db);
    expect(occ).toHaveLength(2);

    const earlier = occ.find((o: any) => o.id === standInId)!;
    const arriving = occ.find((o: any) => o.id !== standInId)!;

    // Earlier occupant: pinned to the boards it played, NOT the arrival anchor,
    // still ACTIVE (no treatment forced), split off (one line by default), and
    // its secret rotated away so the old device token is dead.
    expect(earlier.boards).toEqual([1, 2]);
    expect(earlier.standing).toBe("ACTIVE");
    expect(earlier.isArrivalAnchor).toBe(0);
    expect(earlier.split).toBe(0);
    expect(earlier.withdrawalTreatment).toBeNull();
    expect(earlier.secretKey).not.toBe("standin-secret");
    expect(earlier.secretKey).not.toBe("real-secret");
    expect(earlier.secretKey).toBeTruthy();

    // Arriving pair: the remaining boards, the arrival anchor, ACTIVE, one line
    // by default, holding the new device secret.
    expect(arriving.boards).toEqual([3, 4]);
    expect(arriving.standing).toBe("ACTIVE");
    expect(arriving.isArrivalAnchor).toBe(1);
    expect(arriving.split).toBe(0);
    expect(arriving.withdrawalTreatment).toBeNull();
    expect(arriving.secretKey).toBe("real-secret");
    expect(arriving.seat).toBe("A1NS");
  });

  it("treats a director override as a played board", async () => {
    const db = await setup();
    await seatStandIn(db);

    const { boards } = await import("@/db/games/tables/boards");
    // Board 1 confirmed, board 2 only director-overridden, board 3 unplayed.
    db.insert(boards)
      .values(
        [
          {
            section: "A",
            roundNumber: 1,
            tableNumber: 1,
            boardNumber: 1,
            ns: "A1NS",
            ew: "A1EW",
            confirmedResult: "3NTN=" as BoardOutcome,
            status: "CONFIRMED" as const,
          },
          {
            section: "A",
            roundNumber: 2,
            tableNumber: 1,
            boardNumber: 2,
            ns: "A1NS",
            ew: "A1EW",
            directorOverrideResult: "3NTN+1" as BoardOutcome,
            status: "OVERRIDDEN" as const,
          },
          {
            section: "A",
            roundNumber: 3,
            tableNumber: 1,
            boardNumber: 3,
            ns: "A1NS",
            ew: "A1EW",
            confirmedResult: null,
            status: null,
          },
        ].map(withFixtureMatchId),
      )
      .run();

    const { handoverSeat } = await import("./handover-seat");
    const result = await handoverSeat(gameId, {
      seat: "A1NS",
      realPair: {
        player1: { firstName: "Real", lastName: "One" },
        player2: { firstName: "Real", lastName: "Two" },
      },
      secretKey: "real-secret",
    });

    expect(result.ok).toBe(true);
    const occ = await occupanciesForSeat(db);
    const earlier = occ.find((o: any) => o.isArrivalAnchor === 0)!;
    const arriving = occ.find((o: any) => o.isArrivalAnchor === 1)!;
    expect(earlier.boards).toEqual([1, 2]); // override counts as played
    expect(arriving.boards).toEqual([3]);
    // No treatment is applied by the engine — a substitution has no artificial
    // score; both occupants are ACTIVE and one line by default.
    expect(arriving.standing).toBe("ACTIVE");
    expect(arriving.withdrawalTreatment).toBeNull();
  });

  it("rejects when no pair is seated at the seat", async () => {
    const db = await setup();
    await layBoards(db, [1, 2], [1]);

    const { handoverSeat } = await import("./handover-seat");
    const result = await handoverSeat(gameId, {
      seat: "A1NS",
      realPair: {
        player1: { firstName: "Real", lastName: "One" },
        player2: { firstName: "Real", lastName: "Two" },
      },
      secretKey: "real-secret",
    });

    expect(result.ok).toBe(false);
    expect((await occupanciesForSeat(db)).length).toBe(0);
  });

  it("rejects a second handover on an already-handed-over seat", async () => {
    const db = await setup();
    await seatStandIn(db);
    await layBoards(db, [1, 2, 3, 4], [1, 2]);

    const { handoverSeat } = await import("./handover-seat");
    await handoverSeat(gameId, {
      seat: "A1NS",
      realPair: {
        player1: { firstName: "Real", lastName: "One" },
        player2: { firstName: "Real", lastName: "Two" },
      },
      secretKey: "real-secret",
    });

    const second = await handoverSeat(gameId, {
      seat: "A1NS",
      realPair: {
        player1: { firstName: "Third", lastName: "One" },
        player2: { firstName: "Third", lastName: "Two" },
      },
      secretKey: "third-secret",
    });

    expect(second.ok).toBe(false);
    expect((await occupanciesForSeat(db)).length).toBe(2);
  });

  it("rejects when every board already has a result (nothing to hand over)", async () => {
    const db = await setup();
    await seatStandIn(db);
    await layBoards(db, [1, 2], [1, 2]);

    const { handoverSeat } = await import("./handover-seat");
    const result = await handoverSeat(gameId, {
      seat: "A1NS",
      realPair: {
        player1: { firstName: "Real", lastName: "One" },
        player2: { firstName: "Real", lastName: "Two" },
      },
      secretKey: "real-secret",
    });

    expect(result.ok).toBe(false);
    expect((await occupanciesForSeat(db)).length).toBe(1);
  });
});
