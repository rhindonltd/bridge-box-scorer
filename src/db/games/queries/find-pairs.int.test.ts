// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import { players } from "@/db/games/tables/players";
import { seatOccupancy } from "@/db/games/tables/seat-occupancy";
describe("findPairs — one-line substitution seats", () => {
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
  function player(first: string) {
    return db
      .insert(players)
      .values({ firstName: first, lastName: "X" })
      .returning()
      .get();
  }
  it("stitches the sub's names on as a second line", async () => {
    const [a1, a2, b1, b2] = ["a1", "a2", "b1", "b2"].map(player);
    db.insert(seatOccupancy)
      .values([
        {
          seat: "A1NS",
          boards: [1],
          player1: b1.id,
          player2: b2.id,
          secretKey: "early",
        },
        {
          seat: "A1NS",
          boards: [2],
          player1: a1.id,
          player2: a2.id,
          secretKey: "late",
          isArrivalAnchor: 1,
        },
      ])
      .run();
    const { findPairs } = await import("@/db/games/queries/find-pairs");
    const pairs = await findPairs(db);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].displayNameLines).toEqual([
      "a1 X / a2 X",
      "(Sub) b1 X / b2 X",
    ]);
  });
  it("shows just the main line when the other occupant's players no longer exist", async () => {
    const [a1, a2] = ["a1", "a2"].map(player);
    // A dangling player reference can only come from manual data repair.
    db.$client.pragma("foreign_keys = OFF");
    db.insert(seatOccupancy)
      .values([
        {
          seat: "A1NS",
          boards: [1],
          player1: 9998,
          player2: 9999,
          secretKey: "early",
        },
        {
          seat: "A1NS",
          boards: [2],
          player1: a1.id,
          player2: a2.id,
          secretKey: "late",
          isArrivalAnchor: 1,
        },
      ])
      .run();
    const { findPairs } = await import("@/db/games/queries/find-pairs");
    const pairs = await findPairs(db);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].displayNameLines).toEqual(["a1 X / a2 X"]);
  });
});
