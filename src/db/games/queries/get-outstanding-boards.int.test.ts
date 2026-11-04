// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import { makeBoard, seedFixtureMatch } from "@/mocks/fixtures/db-rows";
import type { NewBoard } from "@/db/games/tables/boards";
import type { PairSeat } from "@/model/participants";

/**
 * Integration coverage for getOutstandingBoards against a real migrated per-game
 * database: it should list only the playable, not-yet-finalized boards (the
 * same filter as getResultsSummary), resolve each board's NS / EW to the seated
 * pair names, order the list stably, and respect the cap.
 */
describe("getOutstandingBoards", () => {
  let harness: DbHarness;

  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
    seedFixtureMatch((await harness.getDb()) as Db);
  });

  afterEach(() => {
    harness.teardown();
  });

  async function seatPair(
    seat: string,
    first1: string,
    first2: string,
  ): Promise<void> {
    const { createPlayer } = await import("@/db/games/actions/create-player");
    const { createParticipant } = await import(
      "@/db/games/actions/create-participant"
    );
    const p1 = await createPlayer(harness.gameId, {
      firstName: first1,
      lastName: "North",
    });
    const p2 = await createPlayer(harness.gameId, {
      firstName: first2,
      lastName: "South",
    });
    await createParticipant(harness.gameId, {
      type: "PAIR",
      initialSeat: seat as PairSeat,
      player1: p1.id,
      player2: p2.id,
      secretKey: `k-${seat}`,
    } as never);
  }

  async function seedBoards(rows: NewBoard[]) {
    const { createBoard } = await import("@/db/games/actions/create-board");
    for (const row of rows) await createBoard(harness.gameId, row);
  }

  it("returns an empty list when nothing is outstanding", async () => {
    await seedBoards([makeBoard({ boardNumber: 1, status: "CONFIRMED" })]);
    const { getOutstandingBoards } = await import(
      "@/db/games/queries/get-outstanding-boards"
    );
    const db = (await harness.getDb()) as Db;
    expect(await getOutstandingBoards(db)).toEqual([]);
  });

  it("lists an outstanding board with the seated pair names", async () => {
    await seatPair("A1NS", "Alice", "Bob");
    await seatPair("A1EW", "Carol", "Dan");
    await seedBoards([makeBoard({ boardNumber: 1, status: "NOT_PLAYED" })]);

    const { getOutstandingBoards } = await import(
      "@/db/games/queries/get-outstanding-boards"
    );
    const db = (await harness.getDb()) as Db;

    expect(await getOutstandingBoards(db)).toEqual([
      {
        section: "A",
        tableNumber: 1,
        boardNumber: 1,
        roundNumber: 1,
        nsPair: "Alice North & Bob South",
        ewPair: "Carol North & Dan South",
      },
    ]);
  });

  it("excludes finalized, sit-out and half-average boards", async () => {
    await seatPair("A1NS", "Alice", "Bob");
    await seatPair("A1EW", "Carol", "Dan");
    await seedBoards([
      makeBoard({ boardNumber: 1, status: "NOT_PLAYED" }),
      makeBoard({ boardNumber: 2, status: "CONFIRMED" }),
      makeBoard({ boardNumber: 3, status: "SIT_OUT" }),
      makeBoard({ boardNumber: 4, status: "HALF_AVERAGE" }),
      makeBoard({ boardNumber: 5, status: "PENDING_CONFIRMATION" }),
    ]);

    const { getOutstandingBoards } = await import(
      "@/db/games/queries/get-outstanding-boards"
    );
    const db = (await harness.getDb()) as Db;

    const result = await getOutstandingBoards(db);
    expect(result.map((b) => b.boardNumber)).toEqual([1, 5]);
  });

  it("caps the list at the requested limit", async () => {
    await seatPair("A1NS", "Alice", "Bob");
    await seatPair("A1EW", "Carol", "Dan");
    await seedBoards(
      [1, 2, 3, 4].map((boardNumber) =>
        makeBoard({ boardNumber, status: "NOT_PLAYED" }),
      ),
    );

    const { getOutstandingBoards } = await import(
      "@/db/games/queries/get-outstanding-boards"
    );
    const db = (await harness.getDb()) as Db;

    const result = await getOutstandingBoards(db, 2);
    expect(result.map((b) => b.boardNumber)).toEqual([1, 2]);
  });

  it("leaves an unseated side null", async () => {
    await seatPair("A1NS", "Alice", "Bob");
    await seedBoards([makeBoard({ boardNumber: 1, status: "NOT_PLAYED" })]);

    const { getOutstandingBoards } = await import(
      "@/db/games/queries/get-outstanding-boards"
    );
    const db = (await harness.getDb()) as Db;

    const [board] = await getOutstandingBoards(db);
    expect(board.nsPair).toBe("Alice North & Bob South");
    expect(board.ewPair).toBeNull();
  });

  // Seat a merged (split=0) handover at A1NS with two ACTIVE occupancies, then
  // mark one the main pair. Returns the two occupancy ids.
  async function seatMergedHandoverA1NS(
    db: Db,
    mainIs: "anchor" | "earlier",
  ): Promise<void> {
    const { players } = await import("@/db/games/tables/players");
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const mk = (first: string, last: string) =>
      db.insert(players).values({ firstName: first, lastName: last }).returning().get()
        .id;
    // Earlier occupant (NOT the arrival anchor).
    db.insert(seatOccupancy)
      .values({
        seat: "A1NS",
        boards: [1],
        player1: mk("Early", "North"),
        player2: mk("Early", "South"),
        secretKey: "k-A1NS-early",
        standing: "ACTIVE",
        isArrivalAnchor: 0,
        isMainLine: mainIs === "earlier" ? 1 : 0,
        split: 0,
      })
      .run();
    // Arriving occupant (the arrival anchor).
    db.insert(seatOccupancy)
      .values({
        seat: "A1NS",
        boards: [2],
        player1: mk("Arr", "North"),
        player2: mk("Arr", "South"),
        secretKey: "k-A1NS-arr",
        standing: "ACTIVE",
        isArrivalAnchor: 1,
        isMainLine: mainIs === "anchor" ? 1 : 0,
        split: 0,
      })
      .run();
  }

  it("names a merged-handover board after the MAIN pair (default anchor)", async () => {
    await seatPair("A1EW", "Carol", "Dan");
    const db = (await harness.getDb()) as Db;
    await seatMergedHandoverA1NS(db, "anchor");
    await seedBoards([makeBoard({ boardNumber: 2, status: "NOT_PLAYED" })]);

    const { getOutstandingBoards } = await import(
      "@/db/games/queries/get-outstanding-boards"
    );
    const [board] = await getOutstandingBoards(db);
    // Main = the arrival anchor (the arriving pair) by default.
    expect(board.nsPair).toBe("Arr North & Arr South");
  });

  it("names a merged-handover board after the re-pointed MAIN pair", async () => {
    await seatPair("A1EW", "Carol", "Dan");
    const db = (await harness.getDb()) as Db;
    await seatMergedHandoverA1NS(db, "earlier");
    await seedBoards([makeBoard({ boardNumber: 2, status: "NOT_PLAYED" })]);

    const { getOutstandingBoards } = await import(
      "@/db/games/queries/get-outstanding-boards"
    );
    const [board] = await getOutstandingBoards(db);
    // Director made the EARLIER pair the main pair → the board is named after it.
    expect(board.nsPair).toBe("Early North & Early South");
  });
});
