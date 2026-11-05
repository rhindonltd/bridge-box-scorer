// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import { makeBoard, seedFixtureMatch } from "@/mocks/fixtures/db-rows";
import type { BoardOutcome } from "@/model/score";

describe("recordLateArrival (design §11)", () => {
  let harness: DbHarness;

  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
    seedFixtureMatch((await harness.getDb()) as Db);
  });

  afterEach(() => {
    harness.teardown();
  });

  /**
   * A1EW is the expected-late seat. Rounds 1–2 have been scored at table 2;
   * A1EW's own rows in rounds 1–3 have no result. Then the late pair is seated.
   */
  async function setup(treatment: "AVERAGE" | "REMOVED" | null = null) {
    const db = (await harness.getDb()) as Db;
    const { createBoard } = await import("@/db/games/actions/create-board");
    const { expectedLateSeats } =
      await import("@/db/games/tables/expected-late-seats");
    const { players } = await import("@/db/games/tables/players");
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");

    db.insert(expectedLateSeats).values({ seat: "A1EW", treatment }).run();
    for (const round of [1, 2]) {
      await createBoard(
        harness.gameId,
        makeBoard({
          roundNumber: round,
          boardNumber: round,
          tableNumber: 2,
          ns: "A2NS",
          ew: "A2EW",
          status: "CONFIRMED",
          confirmedResult: "3NTN=" as BoardOutcome,
        }),
      );
    }
    for (const round of [1, 2, 3]) {
      await createBoard(
        harness.gameId,
        makeBoard({ roundNumber: round, boardNumber: 10 + round, ew: "A1EW" }),
      );
    }
    const p1 = db
      .insert(players)
      .values({ firstName: "L", lastName: "One" })
      .returning()
      .get();
    const p2 = db
      .insert(players)
      .values({ firstName: "L", lastName: "Two" })
      .returning()
      .get();
    db.insert(seatOccupancy)
      .values({ seat: "A1EW", player1: p1.id, player2: p2.id, secretKey: "k" })
      .run();
    return db;
  }

  it("joins at the room's round, marks the earlier boards ABSENT, and clears the mark", async () => {
    const db = await setup("REMOVED");
    const { recordLateArrival } = await import("./record-late-arrival");
    expect(await recordLateArrival(harness.gameId, "A1EW")).toEqual({
      late: true,
      arrivalRound: 2,
    });

    const { boards } = await import("@/db/games/tables/boards");
    const rows = await db.select().from(boards);
    const status = (n: number) => rows.find((r) => r.boardNumber === n)!.status;
    expect(status(11)).toBe("ABSENT");
    expect(status(12)).toBe("NOT_PLAYED");
    expect(status(13)).toBe("NOT_PLAYED");

    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const occ = db.select().from(seatOccupancy).get()!;
    expect(occ.standing).toBe("LATE");
    expect(occ.withdrawnInRound).toBe(2);
    // The director's choice for the empty seat moves onto the pair.
    expect(occ.withdrawalTreatment).toBe("REMOVED");

    const { expectedLateSeats } =
      await import("@/db/games/tables/expected-late-seats");
    expect(await db.select().from(expectedLateSeats)).toEqual([]);
  });

  it("is not late when nothing has been scored yet, but still clears the mark", async () => {
    const db = (await harness.getDb()) as Db;
    const { expectedLateSeats } =
      await import("@/db/games/tables/expected-late-seats");
    db.insert(expectedLateSeats).values({ seat: "A1EW" }).run();
    const { recordLateArrival } = await import("./record-late-arrival");
    expect(await recordLateArrival(harness.gameId, "A1EW")).toEqual({
      late: false,
    });
    expect(await db.select().from(expectedLateSeats)).toEqual([]);
  });

  it("does nothing for a seat that was not marked expected late", async () => {
    await setup();
    const { recordLateArrival } = await import("./record-late-arrival");
    expect(await recordLateArrival(harness.gameId, "A2NS")).toEqual({
      late: false,
    });
  });
});
