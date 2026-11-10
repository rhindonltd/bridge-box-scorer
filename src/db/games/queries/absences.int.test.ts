// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import { players } from "@/db/games/tables/players";
import { seatOccupancy } from "@/db/games/tables/seat-occupancy";
import { expectedLateSeats } from "@/db/games/tables/expected-late-seats";
describe("readAbsences", () => {
  let harness: DbHarness;
  let db: Db;
  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
    db = (await harness.getDb()) as Db;
  });
  afterEach(() => {
    harness.teardown();
  });
  function occupy(
    seat: string,
    extra: Partial<typeof seatOccupancy.$inferInsert> = {},
  ) {
    const p1 = db
      .insert(players)
      .values({ firstName: "P", lastName: seat })
      .returning()
      .get();
    const p2 = db
      .insert(players)
      .values({ firstName: "Q", lastName: seat })
      .returning()
      .get();
    db.insert(seatOccupancy)
      .values({
        seat: seat as never,
        player1: p1.id,
        player2: p2.id,
        secretKey: `k-${Math.random()}`,
        ...extra,
      })
      .run();
  }
  async function read() {
    const { readAbsences } = await import("@/db/games/queries/absences");
    return readAbsences(db);
  }
  it("is empty when everyone is playing", async () => {
    occupy("A1NS");
    expect((await read()).size).toBe(0);
  });
  it("records withdrawn and late pairs from their standing", async () => {
    occupy("A1NS", {
      standing: "WITHDRAWN",
      withdrawnInRound: 3,
      withdrawalTreatment: "REMOVE",
    });
    occupy("A2NS", { standing: "LATE" });
    const absences = await read();
    expect(absences.get("A1NS")).toMatchObject({ kind: "WITHDRAWN", round: 3 });
    // A missing round defaults to 1.
    expect(absences.get("A2NS")).toMatchObject({ kind: "LATE", round: 1 });
  });
  it("keeps WITHDRAWN when another occupancy of the same board is LATE", async () => {
    occupy("A1NS", { standing: "WITHDRAWN", withdrawnInRound: 2 });
    occupy("A1NS", { standing: "LATE", withdrawnInRound: 4 });
    const absences = await read();
    expect(absences.get("A1NS")).toMatchObject({ kind: "WITHDRAWN", round: 2 });
  });
  it("adds empty expected-late seats but ignores a stale mark on an occupied seat", async () => {
    occupy("A1NS");
    db.insert(expectedLateSeats)
      .values([{ seat: "A1NS" }, { seat: "A2EW", treatment: "REMOVED" }])
      .run();
    const absences = await read();
    expect(absences.has("A1NS")).toBe(false);
    expect(absences.get("A2EW")).toMatchObject({ kind: "EMPTY", round: 0 });
  });
});
