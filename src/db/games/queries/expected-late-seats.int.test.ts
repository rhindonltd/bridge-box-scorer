// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
describe("expected-late seat queries", () => {
  let harness: DbHarness;
  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
  });
  afterEach(() => {
    harness.teardown();
  });
  it("adds (idempotently), reads and removes expected-late marks", async () => {
    const db = (await harness.getDb()) as Db;
    const { readExpectedLateSeats, addExpectedLateSeat, removeExpectedLateSeat } =
      await import("@/db/games/queries/expected-late-seats");
    expect(await readExpectedLateSeats(db)).toEqual(new Set());
    await addExpectedLateSeat(db, "A1EW");
    await addExpectedLateSeat(db, "A1EW");
    await addExpectedLateSeat(db, "A2NS");
    expect(await readExpectedLateSeats(db)).toEqual(new Set(["A1EW", "A2NS"]));
    await removeExpectedLateSeat(db, "A1EW");
    expect(await readExpectedLateSeats(db)).toEqual(new Set(["A2NS"]));
  });
});
