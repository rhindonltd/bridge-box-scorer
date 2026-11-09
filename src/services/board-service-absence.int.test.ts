// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import { makeBoard, seedFixtureMatch } from "@/mocks/fixtures/db-rows";
import type { BoardOutcome } from "@/model/score";

/**
 * Travellers for boards a pair missed through absence (design §11): an
 * AVERAGE row shows its AVE± artificial result; a REMOVED row is not shown.
 */
describe("getBoardInstances — absent rows", () => {
  let harness: DbHarness;

  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
    seedFixtureMatch((await harness.getDb()) as Db);
  });

  afterEach(() => {
    harness.teardown();
  });

  async function seedWithdrawal(treatment: "AVERAGE" | "REMOVED") {
    const db = (await harness.getDb()) as Db;
    const { createBoard } = await import("@/db/games/actions/create-board");
    const { players } = await import("@/db/games/tables/players");
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const p1 = db
      .insert(players)
      .values({ firstName: "A", lastName: "X" })
      .returning()
      .get();
    const p2 = db
      .insert(players)
      .values({ firstName: "B", lastName: "X" })
      .returning()
      .get();
    db.insert(seatOccupancy)
      .values({
        seat: "A1NS",
        player1: p1.id,
        player2: p2.id,
        secretKey: "k",
        standing: "WITHDRAWN",
        withdrawnInRound: 2,
        withdrawalTreatment: treatment,
      })
      .run();
    await createBoard(
      harness.gameId,
      makeBoard({
        boardNumber: 2,
        roundNumber: 2,
        tableNumber: 2,
        ns: "A2NS",
        ew: "A2EW",
        status: "CONFIRMED",
        confirmedResult: "3NTN=" as BoardOutcome,
      }),
    );
    await createBoard(
      harness.gameId,
      makeBoard({ boardNumber: 2, roundNumber: 2, status: "ABSENT" }),
    );
    return db;
  }

  it("shows an AVERAGE absent row with its AVE− / AVE+ result", async () => {
    const db = await seedWithdrawal("AVERAGE");
    const { getBoardInstances } = await import("@/services/board-service");
    const rows = await getBoardInstances(db, 2);
    const absent = rows.find((r) => r.participants.ns === "A1NS")!;
    expect(absent.currentResult).toBe("A40/60");
    expect(rows).toHaveLength(2);
  });

  it("hides a REMOVED absent row", async () => {
    const db = await seedWithdrawal("REMOVED");
    const { getBoardInstances } = await import("@/services/board-service");
    const rows = await getBoardInstances(db, 2);
    expect(rows).toHaveLength(1);
    expect(rows[0].participants.ns).toBe("A2NS");
  });

  /**
   * A still-EMPTY expected-late seat: nobody is seated at A1EW, so the row
   * against it stays NOT_PLAYED (it is not marked ABSENT) yet is scored as
   * absent on the leaderboard — the traveller must agree.
   */
  async function seedEmptyLateSeat(treatment: "AVERAGE" | "REMOVED") {
    const db = (await harness.getDb()) as Db;
    const { createBoard } = await import("@/db/games/actions/create-board");
    const { expectedLateSeats } =
      await import("@/db/games/tables/expected-late-seats");
    db.insert(expectedLateSeats).values({ seat: "A1EW", treatment }).run();
    await createBoard(
      harness.gameId,
      makeBoard({
        boardNumber: 5,
        roundNumber: 1,
        tableNumber: 1,
        ns: "A1NS",
        ew: "A1EW",
        status: "NOT_PLAYED",
      }),
    );
    await createBoard(
      harness.gameId,
      makeBoard({
        boardNumber: 5,
        roundNumber: 1,
        tableNumber: 2,
        ns: "A2NS",
        ew: "A2EW",
        status: "CONFIRMED",
        confirmedResult: "3NTN=" as BoardOutcome,
      }),
    );
    return db;
  }

  it("shows a row against an empty expected-late seat as AVE+ for its opponent", async () => {
    const db = await seedEmptyLateSeat("AVERAGE");
    const { getBoardInstances } = await import("@/services/board-service");
    const rows = await getBoardInstances(db, 5);
    const empty = rows.find((r) => r.participants.ew === "A1EW")!;
    // The seat that is not there (EW) is AVE−, its opponent (NS) AVE+.
    expect(empty.currentResult).toBe("A60/40");
    expect(rows).toHaveLength(2);
  });

  it("hides a row against an empty expected-late seat set to Remove", async () => {
    const db = await seedEmptyLateSeat("REMOVED");
    const { getBoardInstances } = await import("@/services/board-service");
    const rows = await getBoardInstances(db, 5);
    expect(rows).toHaveLength(1);
    expect(rows[0].participants.ns).toBe("A2NS");
  });

  it("leaves a played row alone even when its seat is marked expected-late", async () => {
    const db = await seedEmptyLateSeat("AVERAGE");
    const { getBoardInstances } = await import("@/services/board-service");
    const rows = await getBoardInstances(db, 5);
    const played = rows.find((r) => r.participants.ns === "A2NS")!;
    expect(played.currentResult).toBe("3NTN=");
  });
});
