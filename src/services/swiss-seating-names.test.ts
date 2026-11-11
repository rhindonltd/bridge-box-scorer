import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("@/db/games/queries/assignment-players", () => ({
  buildAssignmentPlayerLookup: vi.fn(),
}));
import { buildAssignmentPlayerLookup } from "@/db/games/queries/assignment-players";
import { resolveSwissSeatingNames } from "./swiss-seating-names";
import type { Player } from "@/db/games/tables/players";

function player(id: number, firstName: string): Player {
  return { id, firstName, lastName: "Smith", nationalId: null };
}

/** A pair's two players, keyed in the lookup by its section-qualified seat id. */
function pair(first: string, second: string, ids: [number, number]) {
  return { player1: player(ids[0], first), player2: player(ids[1], second) };
}

const db = {} as never;

describe("resolveSwissSeatingNames", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Pairs 1..4 are seated and named; pair 5 has no occupancy yet.
    vi.mocked(buildAssignmentPlayerLookup).mockResolvedValue(
      new Map([
        ["A1", pair("Alice", "Bob", [1, 2])],
        ["A2", pair("Carol", "Dave", [3, 4])],
        ["A3", pair("Erin", "Frank", [5, 6])],
        ["A4", pair("Gina", "Hal", [7, 8])],
      ]) as never,
    );
  });

  it("names each table's four seats and orders tables by number", async () => {
    const result = await resolveSwissSeatingNames(
      db,
      "A",
      4,
      [
        { tableNumber: 2, ns: 3, ew: 4 },
        { tableNumber: 1, ns: 1, ew: 2 },
      ],
      null,
    );
    expect(result.tables.map((t) => t.tableNumber)).toEqual([1, 2]);
    expect(result.tables[0].players.N?.firstName).toBe("Alice");
    expect(result.tables[0].players.S?.firstName).toBe("Bob");
    expect(result.tables[0].players.E?.firstName).toBe("Carol");
    expect(result.tables[0].players.W?.firstName).toBe("Dave");
    expect(result.bye).toBeNull();
    expect(result.halfMatch).toBeNull();
  });

  it("leaves seats null for a pair that is not seated", async () => {
    const result = await resolveSwissSeatingNames(
      db,
      "A",
      4,
      [
        { tableNumber: 1, ns: 1, ew: 5 },
        { tableNumber: 2, ns: 5, ew: 2 },
      ],
      null,
    );
    expect(result.tables[0].players.E).toBeNull();
    expect(result.tables[0].players.W).toBeNull();
    expect(result.tables[1].players.N).toBeNull();
    expect(result.tables[1].players.S).toBeNull();
  });

  it("names the bye pair", async () => {
    const result = await resolveSwissSeatingNames(db, "A", 4, [], 3);
    expect(result.bye?.pairId).toBe(3);
    expect(result.bye?.players.player1?.firstName).toBe("Erin");
    expect(result.bye?.players.player2?.firstName).toBe("Frank");
  });

  it("leaves the bye pair's players null when it is not seated", async () => {
    const result = await resolveSwissSeatingNames(db, "A", 4, [], 5);
    expect(result.bye).toEqual({
      pairId: 5,
      players: { player1: null, player2: null },
    });
  });

  it("names every pair of a half-match group, null for an unseated one", async () => {
    const result = await resolveSwissSeatingNames(db, "A", 4, [], null, {
      group: { anchor: 1, halfOneOpponent: 2, halfTwoOpponent: 5 },
      anchorTable: 3,
      anchorDirection: "EW",
    });
    expect(result.halfMatch?.anchorTable).toBe(3);
    expect(result.halfMatch?.anchorDirection).toBe("EW");
    expect(result.halfMatch?.anchor.players.player1?.firstName).toBe("Alice");
    expect(result.halfMatch?.halfOneOpponent.players.player2?.firstName).toBe(
      "Dave",
    );
    expect(result.halfMatch?.halfTwoOpponent).toEqual({
      pairId: 5,
      players: { player1: null, player2: null },
    });
  });
});
