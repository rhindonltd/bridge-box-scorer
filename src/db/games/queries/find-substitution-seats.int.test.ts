// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import type { BoardOutcome } from "@/model/score";
import { withFixtureMatchId, seedFixtureMatch } from "@/mocks/fixtures/db-rows";

/**
 * Integration coverage for findSubstitutionSeats against a real migrated
 * per-game SQLite file: it should surface only seats that have had a §2.4.7
 * substitution, each with both occupants, their board counts + eligibility,
 * and the seat's split flag.
 */
let tmpDir: string;
let gameId: string;

describe("findSubstitutionSeats", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "substitutions-"));
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

  async function seatStandIn(db: any): Promise<void> {
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
    db.insert(seatOccupancy)
      .values({
        seat: "A1NS",
        boards: null,
        player1: p1.id,
        player2: p2.id,
        secretKey: "standin-secret",
      })
      .run();
  }

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

  it("returns an empty list when there has been no handover", async () => {
    const db = await setup();
    await seatStandIn(db);
    await layBoards(db, [1, 2, 3, 4], [1, 2]);

    const { findSubstitutionSeats } = await import(
      "./find-substitution-seats"
    );
    expect(await findSubstitutionSeats(db)).toEqual([]);
  });

  it("surfaces the handed-over real pair with the played/missed split", async () => {
    const db = await setup();
    await seatStandIn(db);
    // Seat plays 1..4; 1 & 2 scored (stand-in's), 3 & 4 go to the real pair.
    await layBoards(db, [1, 2, 3, 4], [1, 2]);

    const { handoverSeat } = await import("@/db/games/actions/handover-seat");
    await handoverSeat(gameId, {
      seat: "A1NS",
      realPair: {
        player1: { firstName: "Real", lastName: "One" },
        player2: { firstName: "Real", lastName: "Two" },
      },
      secretKey: "real-secret",
    });

    const { findSubstitutionSeats } = await import(
      "./find-substitution-seats"
    );
    const list = await findSubstitutionSeats(db);

    // The arriving (anchor) pair finished the session: it played boards 3-4;
    // the earlier pair played 1-2. A fresh handover is one line (split=0) and
    // both occupants are eligible (ACTIVE).
    expect(list).toHaveLength(1);
    const seatRow = list[0];
    expect(seatRow.seat).toBe("A1NS");
    expect(seatRow.pair).toBe("Real One & Real Two");
    expect(seatRow.playedCount).toBe(2); // boards 3, 4
    expect(seatRow.missedCount).toBe(2); // boards 1, 2 (earlier pair's)
    expect(seatRow.split).toBe(false);

    // Anchor first, then the earlier pair; both eligible, correct board counts.
    expect(seatRow.occupants).toHaveLength(2);
    const [anchor, earlier] = seatRow.occupants;
    expect(anchor.isArrivalAnchor).toBe(true);
    expect(anchor.pair).toBe("Real One & Real Two");
    expect(anchor.boardCount).toBe(2);
    expect(anchor.eligible).toBe(true);
    expect(earlier.isArrivalAnchor).toBe(false);
    expect(earlier.pair).toBe("Stand In1 & Stand In2");
    expect(earlier.boardCount).toBe(2);
    expect(earlier.eligible).toBe(true);
  });

  it("reflects a stored split + eligibility from setSubstitutionOptions", async () => {
    const db = await setup();
    await seatStandIn(db);
    await layBoards(db, [1, 2, 3, 4], [1]);

    const { handoverSeat } = await import("@/db/games/actions/handover-seat");
    await handoverSeat(gameId, {
      seat: "A1NS",
      realPair: {
        player1: { firstName: "Real", lastName: "One" },
        player2: { firstName: "Real", lastName: "Two" },
      },
      secretKey: "real-secret",
    });

    const { findSubstitutionSeats } = await import(
      "./find-substitution-seats"
    );
    const before = await findSubstitutionSeats(db);
    const earlierId = before[0].occupants.find((o) => !o.isArrivalAnchor)!.id;
    const anchorId = before[0].occupants.find((o) => o.isArrivalAnchor)!.id;

    // Split the seat and mark the earlier pair ineligible.
    const { setSubstitutionOptions } = await import(
      "@/db/games/actions/set-substitution-options"
    );
    await setSubstitutionOptions(gameId, "A1NS", {
      split: true,
      eligibility: [
        { id: anchorId, eligible: true },
        { id: earlierId, eligible: false },
      ],
    });

    const [row] = await findSubstitutionSeats(db);
    expect(row.split).toBe(true);
    expect(row.playedCount).toBe(3); // anchor played 2,3,4
    expect(row.missedCount).toBe(1); // earlier played 1
    const anchor = row.occupants.find((o) => o.isArrivalAnchor)!;
    const earlier = row.occupants.find((o) => !o.isArrivalAnchor)!;
    expect(anchor.eligible).toBe(true);
    expect(earlier.eligible).toBe(false);
  });
});
