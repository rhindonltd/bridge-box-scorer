// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import { players } from "@/db/games/tables/players";
import { seatOccupancy } from "@/db/games/tables/seat-occupancy";
import { boards } from "@/db/games/tables/boards";
import { makeBoard, seedFixtureMatch } from "@/mocks/fixtures/db-rows";
/**
 * Edge cases for findSubstitutionSeats seeded directly: whole-seat (null board
 * set) occupants, three occupants on one seat, several substituted seats, and
 * board rows that carry the seat only on the EW side or not at all.
 */
describe("findSubstitutionSeats — edge cases", () => {
  let harness: DbHarness;
  let db: Db;
  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
    db = (await harness.getDb()) as Db;
    seedFixtureMatch(db);
  });
  afterEach(() => {
    harness.teardown();
  });
  function occupy(seat: string, tag: string, boardSet: number[] | null) {
    const p1 = db
      .insert(players)
      .values({ firstName: tag, lastName: "One" })
      .returning()
      .get();
    const p2 = db
      .insert(players)
      .values({ firstName: tag, lastName: "Two" })
      .returning()
      .get();
    db.insert(seatOccupancy)
      .values({
        seat: seat as never,
        boards: boardSet,
        player1: p1.id,
        player2: p2.id,
        secretKey: `k-${tag}`,
      })
      .run();
  }
  it("lists several seats in seat order with whole-seat occupants counted against the seat's boards", async () => {
    // Insert A2NS first so the seat sort has to reorder.
    occupy("A2NS", "c", [1]);
    occupy("A2NS", "d", [2]);
    occupy("A1NS", "a", null);
    occupy("A1NS", "b", null);
    occupy("A1NS", "e", [2]);
    db.insert(boards)
      .values([
        makeBoard({ roundNumber: 1, boardNumber: 1, ns: "A1NS", ew: "A1EW" }),
        // The seat appears only on the EW side of this row.
        makeBoard({ roundNumber: 2, boardNumber: 2, ns: "A9NS", ew: "A1NS" }),
        // A row involving neither substituted seat.
        makeBoard({ roundNumber: 3, boardNumber: 3, ns: "A7NS", ew: "A7EW" }),
      ])
      .run();
    const { findSubstitutionSeats } = await import(
      "@/db/games/queries/find-substitution-seats"
    );
    const result = await findSubstitutionSeats(db);
    expect(result.map((s) => s.seat)).toEqual(["A1NS", "A2NS"]);
    const a1 = result[0];
    expect(a1.occupants).toHaveLength(3);
    // The first whole-seat occupant is the anchor; the rest follow in id order.
    expect(a1.occupants.map((o) => o.pair.split(" ")[0])).toEqual(["a", "b", "e"]);
    // A whole-seat occupant counts every board the seat plays (boards 1 and 2).
    expect(a1.occupants[0].boardCount).toBe(2);
    expect(a1.playedCount).toBe(2);
    expect(a1.missedCount).toBe(0);
  });
});
