import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSchedule } from "./schedule-service";

vi.mock("@/db/games", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/db/games/tables/boards", () => ({
  boards: {
    ns: "ns",
    ew: "ew",
    roundNumber: "roundNumber",
    boardNumber: "boardNumber",
  },
}));

vi.mock("@/db/games/tables/seat-occupancy", () => ({
  seatOccupancy: { seat: "seat", anchorId: "anchorId" },
}));

vi.mock("@/db/games/tables/players", () => ({
  players: "players",
}));

vi.mock("@/db/games/tables/expected-late-seats", () => ({
  expectedLateSeats: { seat: "seat" },
}));

vi.mock("@/db/games/queries/expected-late-seats", () => ({
  readExpectedLateSeats: vi.fn().mockResolvedValue(new Set<string>()),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => args),
  or: vi.fn((...args: any[]) => args),
}));

import { Db, getDb as getPairsDb } from "@/db/games";

/**
 * The schedule service reads, in order:
 *  1. `seatAnchorId`           — seatOccupancy `.select().from().where().get()`
 *                                → `{ seat, anchorId }` (null when unseated)
 *  2. `findPairBoards`         — boards `.select().from().where()` → this pair's rows
 *  3. buildAssignmentPlayerLookup → seatOccupancy `.select().from()` → occupancy rows
 *  4. buildAssignmentPlayerLookup → players `.select().from()` → player rows
 *  5. `countTotalRounds`       — boards `.select().from()` → all-game round rows
 *
 * `expectedLateSeats` is read via a mocked query (not a `select`), so it does
 * not consume a `select` slot.
 *
 * The occupancy rows carry `{ seat, anchorId, player1, player2 }`; a board row's
 * `ns`/`ew` holds the ANCHOR id, which the lookup keys on (anchorId ?? seat).
 */
type SelectStep =
  | { kind: "get"; value: unknown }
  | { kind: "where"; value: unknown[] }
  | { kind: "from"; value: unknown[] };

function mockDbFromSteps(steps: SelectStep[]): Db {
  let i = 0;
  return {
    select: vi.fn().mockImplementation(() => {
      const step = steps[i++];
      if (step == null) return { from: () => Promise.resolve([]) };
      if (step.kind === "get") {
        return {
          from: () => ({ where: () => ({ get: () => Promise.resolve(step.value) }) }),
        };
      }
      if (step.kind === "where") {
        return { from: () => ({ where: () => Promise.resolve(step.value) }) };
      }
      return { from: () => Promise.resolve(step.value) };
    }),
  } as unknown as Db;
}

describe("schedule-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPlayerSchedule (PAIRS)", () => {
    it("returns null when the seat is not occupied", async () => {
      const db = mockDbFromSteps([{ kind: "get", value: undefined }]);
      vi.mocked(getPairsDb).mockResolvedValue(db as any);

      const result = await getSchedule(db, "99NS");

      expect(result).toBeNull();
    });

    it("returns schedule with side NS for seat ending in NS", async () => {
      // Full-seat movement: anchor id === seat (A1NS-style). Here the seat and
      // its board id are both "1NS".
      const db = mockDbFromSteps([
        { kind: "get", value: { seat: "1NS", anchorId: "1NS" } },
        {
          kind: "where",
          value: [
            { roundNumber: 1, tableNumber: 1, boardNumber: 1, ns: "1NS", ew: "1EW", status: "CONFIRMED" },
            { roundNumber: 1, tableNumber: 1, boardNumber: 2, ns: "1NS", ew: "1EW", status: "NOT_PLAYED" },
            { roundNumber: 2, tableNumber: 2, boardNumber: 3, ns: "1NS", ew: "2EW", status: "NOT_PLAYED" },
          ],
        },
        {
          kind: "from",
          value: [
            { seat: "1NS", anchorId: "1NS", player1: 1, player2: 2 },
            { seat: "1EW", anchorId: "1EW", player1: 3, player2: 4 },
          ],
        },
        {
          kind: "from",
          value: [
            { id: 1, firstName: "Alice", lastName: "Smith" },
            { id: 2, firstName: "Bob", lastName: "Jones" },
            { id: 3, firstName: "Carol", lastName: "Brown" },
            { id: 4, firstName: "Dave", lastName: "Wilson" },
          ],
        },
        {
          kind: "from",
          value: [
            { roundNumber: 1 }, { roundNumber: 1 }, { roundNumber: 2 },
            { roundNumber: 2 }, { roundNumber: 3 },
          ],
        },
      ]);
      vi.mocked(getPairsDb).mockResolvedValue(db as any);

      const result = await getSchedule(db, "1NS");

      expect(result).not.toBeNull();
      expect(result!.side).toBe("NS");
      expect(result!.assignmentId).toBe("1NS");
      expect(result!.rounds).toHaveLength(3);
      expect(result!.rounds[0].roundNumber).toBe(1);
      expect(result!.rounds[0].boards).toEqual([1, 2]);
      expect(result!.rounds[0].side).toBe("NS");
      expect(result!.rounds[1].side).toBe("NS");
      expect(result!.rounds[1].roundNumber).toBe(2);
      expect(result!.rounds[2].roundNumber).toBe(3);
      expect(result!.rounds[2].sitOut).toBe(true);
      expect(result!.rounds[2].boards).toEqual([]);
    });

    it("marks a round whose boards are all SIT_OUT as a sit-out, keeping its table", async () => {
      const db = mockDbFromSteps([
        { kind: "get", value: { seat: "1NS", anchorId: "1NS" } },
        {
          kind: "where",
          value: [
            { roundNumber: 1, tableNumber: 1, boardNumber: 1, ns: "1NS", ew: "1EW", status: "NOT_PLAYED" },
            { roundNumber: 2, tableNumber: 3, boardNumber: 3, ns: "1NS", ew: "9EW", status: "SIT_OUT" },
            { roundNumber: 2, tableNumber: 3, boardNumber: 4, ns: "1NS", ew: "9EW", status: "SIT_OUT" },
          ],
        },
        {
          kind: "from",
          value: [{ seat: "1NS", anchorId: "1NS", player1: 1, player2: 2 }],
        },
        {
          kind: "from",
          value: [
            { id: 1, firstName: "Alice", lastName: "Smith" },
            { id: 2, firstName: "Bob", lastName: "Jones" },
          ],
        },
        { kind: "from", value: [{ roundNumber: 1 }, { roundNumber: 2 }] },
      ]);
      vi.mocked(getPairsDb).mockResolvedValue(db as any);

      const result = await getSchedule(db, "1NS");

      expect(result).not.toBeNull();
      const sitOutRound = result!.rounds.find((r) => r.roundNumber === 2)!;
      expect(sitOutRound.sitOut).toBe(true);
      expect(sitOutRound.tableNumber).toBe(3);
      expect(sitOutRound.boards).toEqual([]);
    });

    it("returns schedule with side EW for seat ending in EW", async () => {
      const db = mockDbFromSteps([
        { kind: "get", value: { seat: "1EW", anchorId: "1EW" } },
        {
          kind: "where",
          value: [
            { roundNumber: 1, tableNumber: 1, boardNumber: 1, ns: "1NS", ew: "1EW", status: "NOT_PLAYED" },
          ],
        },
        {
          kind: "from",
          value: [
            { seat: "1NS", anchorId: "1NS", player1: 1, player2: 2 },
            { seat: "1EW", anchorId: "1EW", player1: 3, player2: 4 },
          ],
        },
        { kind: "from", value: [] },
        { kind: "from", value: [{ roundNumber: 1 }] },
      ]);
      vi.mocked(getPairsDb).mockResolvedValue(db as any);

      const result = await getSchedule(db, "1EW");

      expect(result).not.toBeNull();
      expect(result!.side).toBe("EW");
      expect(result!.assignmentId).toBe("1EW");
      expect(result!.rounds[0].side).toBe("EW");
    });

    it("leaves opponents null when their occupancy resolves no players", async () => {
      const db = mockDbFromSteps([
        { kind: "get", value: { seat: "1NS", anchorId: "1NS" } },
        {
          kind: "where",
          value: [
            { roundNumber: 1, tableNumber: 1, boardNumber: 1, ns: "1NS", ew: "1EW", status: "NOT_PLAYED" },
          ],
        },
        {
          kind: "from",
          // EW occupancy references a missing player1 (999), so the lookup drops
          // it; the NS pair resolves fully.
          value: [
            { seat: "1NS", anchorId: "1NS", player1: 1, player2: 2 },
            { seat: "1EW", anchorId: "1EW", player1: 999, player2: 4 },
          ],
        },
        {
          kind: "from",
          value: [
            { id: 1, firstName: "Alice", lastName: "Smith" },
            { id: 2, firstName: "Bob", lastName: "Jones" },
            { id: 4, firstName: "Dave", lastName: "Wilson" },
          ],
        },
        { kind: "from", value: [{ roundNumber: 1 }] },
      ]);
      vi.mocked(getPairsDb).mockResolvedValue(db as any);

      const result = await getSchedule(db, "1NS");

      expect(result).not.toBeNull();
      expect(result!.rounds[0].players.N).toMatchObject({ firstName: "Alice" });
      expect(result!.rounds[0].players.E).toBeNull();
      expect(result!.rounds[0].players.W).toBeNull();
    });

    it("reports zero total rounds when the game has no boards at all", async () => {
      const db = mockDbFromSteps([
        { kind: "get", value: { seat: "1NS", anchorId: "1NS" } },
        { kind: "where", value: [] },
        { kind: "from", value: [] },
        { kind: "from", value: [] },
        { kind: "from", value: [] },
      ]);
      vi.mocked(getPairsDb).mockResolvedValue(db as any);

      const result = await getSchedule(db, "1NS");

      expect(result).not.toBeNull();
      expect(result!.rounds).toHaveLength(0);
    });
  });

  describe("2 half matches round", () => {
    type Row = {
      roundNumber: number;
      tableNumber: number;
      boardNumber: number;
      ns: string;
      ew: string;
      status: string;
    };

    /**
     * Build a mock db for one pair's schedule from its board rows. Three pairs
     * are seated: anchor A1NS, opp1 A2NS, opp2 A1EW — a Swiss-style full-seat
     * movement, so each seat's anchor id equals the seat.
     */
    function makeDb(seat: string, pairRows: Row[]): Db {
      return mockDbFromSteps([
        { kind: "get", value: { seat, anchorId: seat } },
        { kind: "where", value: pairRows },
        {
          kind: "from",
          value: [
            { seat: "A1NS", anchorId: "A1NS", player1: 1, player2: 2 },
            { seat: "A2NS", anchorId: "A2NS", player1: 3, player2: 4 },
            { seat: "A1EW", anchorId: "A1EW", player1: 5, player2: 6 },
          ],
        },
        {
          kind: "from",
          value: [
            { id: 1, firstName: "An", lastName: "Chor" },
            { id: 2, firstName: "An2", lastName: "Chor2" },
            { id: 3, firstName: "Op", lastName: "One" },
            { id: 4, firstName: "Op2", lastName: "One2" },
            { id: 5, firstName: "Op", lastName: "Two" },
            { id: 6, firstName: "Op2", lastName: "Two2" },
          ],
        },
        { kind: "from", value: [{ roundNumber: 1 }] },
      ]);
    }

    it("gives the anchor two segments (one per opponent) across the midpoint", async () => {
      const rows: Row[] = [
        { roundNumber: 1, tableNumber: 1, boardNumber: 1, ns: "A1NS", ew: "A2NS", status: "CONFIRMED" },
        { roundNumber: 1, tableNumber: 1, boardNumber: 2, ns: "A1NS", ew: "A2NS", status: "CONFIRMED" },
        { roundNumber: 1, tableNumber: 1, boardNumber: 3, ns: "A1NS", ew: "A1EW", status: "NOT_PLAYED" },
        { roundNumber: 1, tableNumber: 1, boardNumber: 4, ns: "A1NS", ew: "A1EW", status: "NOT_PLAYED" },
      ];
      const db = makeDb("A1NS", rows);
      vi.mocked(getPairsDb).mockResolvedValue(db as any);

      const result = await getSchedule(db, "A1NS");
      const round = result!.rounds[0];

      expect(round.sitOut).toBeFalsy();
      expect(round.halfMatch?.role).toBe("anchor");
      expect(round.halfMatch?.segments).toHaveLength(2);
      expect(round.halfMatch?.segments[0]).toMatchObject({ half: "first", boards: [1, 2] });
      expect(round.halfMatch?.segments[1]).toMatchObject({ half: "second", boards: [3, 4] });
      expect(round.boards).toEqual([1, 2, 3, 4]);
    });

    it("gives a first-half non-anchor one segment and excludes its compensated boards", async () => {
      const rows: Row[] = [
        { roundNumber: 1, tableNumber: 1, boardNumber: 1, ns: "A1NS", ew: "A2NS", status: "CONFIRMED" },
        { roundNumber: 1, tableNumber: 1, boardNumber: 2, ns: "A1NS", ew: "A2NS", status: "CONFIRMED" },
        { roundNumber: 1, tableNumber: 7, boardNumber: 3, ns: "A2NS", ew: "PHANTOM", status: "HALF_AVERAGE" },
        { roundNumber: 1, tableNumber: 7, boardNumber: 4, ns: "A2NS", ew: "PHANTOM", status: "HALF_AVERAGE" },
      ];
      const db = makeDb("A2NS", rows);
      vi.mocked(getPairsDb).mockResolvedValue(db as any);

      const result = await getSchedule(db, "A2NS");
      const round = result!.rounds[0];

      expect(round.halfMatch?.role).toBe("firstHalf");
      expect(round.halfMatch?.segments).toHaveLength(1);
      expect(round.halfMatch?.segments[0]).toMatchObject({ half: "first", boards: [1, 2] });
      expect(round.boards).toEqual([1, 2]);
    });

    it("gives a second-half non-anchor one segment with the second-half marker", async () => {
      const rows: Row[] = [
        { roundNumber: 1, tableNumber: 8, boardNumber: 1, ns: "A1EW", ew: "PHANTOM", status: "HALF_AVERAGE" },
        { roundNumber: 1, tableNumber: 8, boardNumber: 2, ns: "A1EW", ew: "PHANTOM", status: "HALF_AVERAGE" },
        { roundNumber: 1, tableNumber: 1, boardNumber: 3, ns: "A1NS", ew: "A1EW", status: "NOT_PLAYED" },
        { roundNumber: 1, tableNumber: 1, boardNumber: 4, ns: "A1NS", ew: "A1EW", status: "NOT_PLAYED" },
      ];
      const db = makeDb("A1EW", rows);
      vi.mocked(getPairsDb).mockResolvedValue(db as any);

      const result = await getSchedule(db, "A1EW");
      const round = result!.rounds[0];

      expect(round.halfMatch?.role).toBe("secondHalf");
      expect(round.halfMatch?.segments[0]).toMatchObject({ half: "second", boards: [3, 4] });
      expect(round.boards).toEqual([3, 4]);
      expect(round.side).toBe("EW");
    });
  });
});
