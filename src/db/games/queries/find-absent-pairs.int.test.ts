// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import { makeBoard, seedFixtureMatch } from "@/mocks/fixtures/db-rows";

describe("findAbsentPairs + setAbsenceTreatment (design §11)", () => {
  let harness: DbHarness;

  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
    seedFixtureMatch((await harness.getDb()) as Db);
  });

  afterEach(() => {
    harness.teardown();
  });

  async function setup() {
    const db = (await harness.getDb()) as Db;
    const { createBoard } = await import("@/db/games/actions/create-board");
    const { players } = await import("@/db/games/tables/players");
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const { expectedLateSeats } =
      await import("@/db/games/tables/expected-late-seats");
    const p = (first: string) =>
      db
        .insert(players)
        .values({ firstName: first, lastName: "X" })
        .returning()
        .get();
    db.insert(seatOccupancy)
      .values({
        seat: "A1NS",
        player1: p("Wyn").id,
        player2: p("Wes").id,
        secretKey: "k1",
        standing: "WITHDRAWN",
        withdrawnInRound: 2,
      })
      .run();
    db.insert(seatOccupancy)
      .values({
        seat: "A2NS",
        player1: p("Lou").id,
        player2: p("Lee").id,
        secretKey: "k2",
        standing: "LATE",
        withdrawnInRound: 3,
        withdrawalTreatment: "REMOVED",
      })
      .run();
    db.insert(expectedLateSeats).values({ seat: "A3EW" }).run();
    // A1NS misses rounds 2–3; A2NS missed rounds 1–2; A3EW misses round 1.
    for (const r of [2, 3]) {
      await createBoard(
        harness.gameId,
        makeBoard({ roundNumber: r, boardNumber: r, status: "ABSENT" }),
      );
    }
    for (const r of [1, 2]) {
      await createBoard(
        harness.gameId,
        makeBoard({
          roundNumber: r,
          boardNumber: 10 + r,
          tableNumber: 2,
          ns: "A2NS",
          ew: "A2EW",
          status: "ABSENT",
        }),
      );
    }
    await createBoard(
      harness.gameId,
      makeBoard({
        roundNumber: 1,
        boardNumber: 20,
        tableNumber: 3,
        ns: "A3NS",
        ew: "A3EW",
      }),
    );
    return db;
  }

  it("lists late arrivals (incl. empty seats) first, then withdrawals", async () => {
    const db = await setup();
    const { findAbsentPairs } = await import("./find-absent-pairs");
    expect(await findAbsentPairs(db)).toEqual([
      {
        seat: "A2NS",
        kind: "LATE",
        pair: "Lou X & Lee X",
        round: 3,
        treatment: "REMOVED",
        missedBoards: 2,
      },
      {
        seat: "A1NS",
        kind: "WITHDRAWN",
        pair: "Wyn X & Wes X",
        round: 2,
        treatment: "AVERAGE",
        missedBoards: 2,
      },
      {
        seat: "A3EW",
        kind: "EMPTY",
        pair: null,
        round: null,
        treatment: "AVERAGE",
        missedBoards: 1,
      },
    ]);
  });

  it("returns an empty list when nobody is absent", async () => {
    const db = (await harness.getDb()) as Db;
    const { findAbsentPairs } = await import("./find-absent-pairs");
    expect(await findAbsentPairs(db)).toEqual([]);
  });
  it("orders absences of the same kind by seat and tolerates a missing player row", async () => {
    const db = await setup();
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    // A second withdrawal on a seat that sorts before A1NS... and after it.
    db.$client.pragma("foreign_keys = OFF");
    db.insert(seatOccupancy)
      .values({
        seat: "A0NS",
        player1: 9998,
        player2: 9999,
        secretKey: "k0",
        standing: "WITHDRAWN",
        withdrawnInRound: 1,
      })
      .run();
    const { findAbsentPairs } = await import("./find-absent-pairs");
    const result = await findAbsentPairs(db);
    expect(result.filter((a) => a.kind === "WITHDRAWN").map((a) => a.seat)).toEqual(
      ["A0NS", "A1NS"],
    );
    expect(result.find((a) => a.seat === "A0NS")?.pair).toBe(" & ");
  });
  it("sets the treatment on the absent occupancy or the empty seat", async () => {
    const db = await setup();
    const { setAbsenceTreatment } =
      await import("@/db/games/actions/set-absence-treatment");
    expect(await setAbsenceTreatment(harness.gameId, "A1NS", "REMOVED")).toBe(
      true,
    );
    expect(await setAbsenceTreatment(harness.gameId, "A3EW", "REMOVED")).toBe(
      true,
    );
    expect(await setAbsenceTreatment(harness.gameId, "A9NS", "REMOVED")).toBe(
      false,
    );

    const { findAbsentPairs } = await import("./find-absent-pairs");
    const byseat = Object.fromEntries(
      (await findAbsentPairs(db)).map((a) => [a.seat, a.treatment]),
    );
    expect(byseat).toEqual({
      A1NS: "REMOVED",
      A2NS: "REMOVED",
      A3EW: "REMOVED",
    });
  });
});
