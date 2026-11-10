// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import { players } from "@/db/games/tables/players";
import { seatOccupancy } from "@/db/games/tables/seat-occupancy";
/**
 * Integration coverage for the seat → players lookups (whole-seat and per
 * board), including handover seats and occupancies whose players are missing.
 */
describe("assignment player lookups", () => {
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
  function pair(tag: string) {
    const p1 = db
      .insert(players)
      .values({ firstName: `${tag}1`, lastName: "X" })
      .returning()
      .get();
    const p2 = db
      .insert(players)
      .values({ firstName: `${tag}2`, lastName: "X" })
      .returning()
      .get();
    return [p1, p2] as const;
  }
  function occupy(
    seat: string,
    [p1, p2]: ReturnType<typeof pair>,
    extra: Partial<typeof seatOccupancy.$inferInsert> = {},
  ) {
    db.insert(seatOccupancy)
      .values({
        seat: seat as never,
        player1: p1.id,
        player2: p2.id,
        secretKey: `k-${seat}-${Math.random()}`,
        ...extra,
      })
      .run();
  }
  it("buildAssignmentPlayerLookup keys by anchor id, falling back to the seat", async () => {
    const a = pair("a");
    const b = pair("b");
    occupy("A1NS", a);
    occupy("A2NS", b, { anchorId: "2" });
    const { buildAssignmentPlayerLookup } = await import(
      "@/db/games/queries/assignment-players"
    );
    const lookup = await buildAssignmentPlayerLookup(db);
    expect(lookup.get("A1NS")?.player1.firstName).toBe("a1");
    expect(lookup.get("2")?.player2.firstName).toBe("b2");
    expect(lookup.has("A2NS")).toBe(false);
  });
  it("buildAssignmentPlayerLookup skips an occupancy whose player row is missing", async () => {
    occupy("A1NS", pair("a"));
    // A dangling player id can only arise from manual data repair, so switch
    // the foreign-key check off to store one.
    db.$client.pragma("foreign_keys = OFF");
    db.insert(seatOccupancy)
      .values({ seat: "A2NS", player1: 9998, player2: 9999, secretKey: "z" })
      .run();
    const { buildAssignmentPlayerLookup } = await import(
      "@/db/games/queries/assignment-players"
    );
    const lookup = await buildAssignmentPlayerLookup(db);
    expect([...lookup.keys()]).toEqual(["A1NS"]);
  });
  it("buildPerBoardPlayerLookup resolves ordinary, handover and unknown seats", async () => {
    occupy("A1NS", pair("whole"));
    occupy("A2NS", pair("early"), { boards: [1, 2] });
    occupy("A2NS", pair("late"), { boards: [3, 4] });
    occupy("A3NS", pair("holeA"), { boards: [1] });
    occupy("A3NS", pair("holeB"), { boards: [2] });
    occupy("A4NS", pair("anyA"), { boards: [1] });
    occupy("A4NS", pair("anyB"));
    db.$client.pragma("foreign_keys = OFF");
    db.insert(seatOccupancy)
      .values({ seat: "A5NS", player1: 9998, player2: 9999, secretKey: "z" })
      .run();
    const { buildPerBoardPlayerLookup } = await import(
      "@/db/games/queries/assignment-players"
    );
    const find = await buildPerBoardPlayerLookup(db);
    expect(find("A1NS", 7)?.player1.firstName).toBe("whole1");
    expect(find("A2NS", 2)?.player1.firstName).toBe("early1");
    expect(find("A2NS", 3)?.player1.firstName).toBe("late1");
    // Handover seat where no occupant covers the board and none is whole-seat.
    expect(find("A3NS", 9)).toBeNull();
    // Falls back to the whole-seat occupant for an uncovered board.
    expect(find("A4NS", 9)?.player1.firstName).toBe("anyB1");
    expect(find("A9NS", 1)).toBeNull();
    // Occupancy with missing players contributes nothing.
    expect(find("A5NS", 1)).toBeNull();
  });
});
