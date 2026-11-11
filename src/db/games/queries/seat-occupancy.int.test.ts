// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
describe("findNonPrimaryOccupantPairs", () => {
  let harness: DbHarness;
  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
  });
  afterEach(() => {
    harness.teardown();
  });
  it("lists the non-anchor occupant of a split seat and skips one whose players are missing", async () => {
    const db = (await harness.getDb()) as Db;
    const { players } = await import("@/db/games/tables/players");
    const { seatOccupancy: table } = await import(
      "@/db/games/tables/seat-occupancy"
    );
    const mk = (n: string) =>
      db
        .insert(players)
        .values({ firstName: n, lastName: "X" })
        .returning()
        .get().id;
    db.insert(table)
      .values([
        {
          seat: "A1NS",
          boards: [1],
          player1: mk("a"),
          player2: mk("b"),
          secretKey: "s1",
          split: 1,
        },
        {
          seat: "A1NS",
          boards: [2],
          player1: mk("c"),
          player2: mk("d"),
          secretKey: "s2",
          split: 1,
          isArrivalAnchor: 1,
        },
        // A one-line seat contributes nothing.
        {
          seat: "A2NS",
          boards: [1],
          player1: mk("e"),
          player2: mk("f"),
          secretKey: "s3",
        },
        {
          seat: "A2NS",
          boards: [2],
          player1: mk("g"),
          player2: mk("h"),
          secretKey: "s4",
          isArrivalAnchor: 1,
        },
      ])
      .run();
    const { findNonPrimaryOccupantPairs } = await import(
      "@/db/games/queries/seat-occupancy"
    );
    const found = await findNonPrimaryOccupantPairs(db);
    expect(found.map((f) => [f.seat, f.player1.firstName])).toEqual([
      ["A1NS", "a"],
    ]);
    // Now a split seat whose non-anchor occupant has dangling players.
    db.$client.pragma("foreign_keys = OFF");
    db.insert(table)
      .values([
        { seat: "A3NS", boards: [1], player1: 9998, player2: 9999, secretKey: "s5", split: 1 },
        {
          seat: "A3NS",
          boards: [2],
          player1: mk("i"),
          player2: mk("j"),
          secretKey: "s6",
          split: 1,
          isArrivalAnchor: 1,
        },
      ])
      .run();
    expect((await findNonPrimaryOccupantPairs(db)).map((f) => f.seat)).toEqual([
      "A1NS",
    ]);
  });
  it("is empty when no seat has a split handover", async () => {
    const db = (await harness.getDb()) as Db;
    const { findNonPrimaryOccupantPairs } = await import(
      "@/db/games/queries/seat-occupancy"
    );
    expect(await findNonPrimaryOccupantPairs(db)).toEqual([]);
  });
});
