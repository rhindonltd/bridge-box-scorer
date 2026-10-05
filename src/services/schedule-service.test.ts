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

vi.mock("@/db/games/tables/assignments", () => ({
  assignments: { initialSeat: "initialSeat", id: "id" },
}));

vi.mock("@/db/games/tables/participants", () => ({
  participants: "pairParticipants",
}));

vi.mock("@/db/games/tables/players", () => ({
  players: "players",
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => args),
  or: vi.fn((...args: any[]) => args),
}));

import { Db, getDb as getPairsDb } from "@/db/games";

describe("schedule-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPlayerSchedule (PAIRS)", () => {
    it("returns null when assignment not found", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        }),
      } as unknown as Db;
      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);

      const result = await getSchedule(mockDb, "99NS");

      expect(result).toBeNull();
    });

    it("returns schedule with side NS for seat ending in NS", async () => {
      let selectCallCount = 0;

      const mockDb = {
        select: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  get: vi
                    .fn()
                    .mockResolvedValue({ id: "assign-1", initialSeat: "1NS" }),
                }),
              }),
            };
          } else if (selectCallCount === 2) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([
                  {
                    roundNumber: 1,
                    tableNumber: 1,
                    boardNumber: 1,
                    ns: "assign-1",
                    ew: "assign-2",
                    status: "CONFIRMED",
                  },
                  {
                    roundNumber: 1,
                    tableNumber: 1,
                    boardNumber: 2,
                    ns: "assign-1",
                    ew: "assign-2",
                    status: "NOT_PLAYED",
                  },
                  {
                    roundNumber: 2,
                    tableNumber: 2,
                    boardNumber: 3,
                    ns: "assign-1",
                    ew: "assign-3",
                    status: "NOT_PLAYED",
                  },
                ]),
              }),
            };
          } else if (selectCallCount === 3) {
            return {
              from: vi.fn().mockResolvedValue([
                { id: "assign-1", initialSeat: "1NS" },
                { id: "assign-2", initialSeat: "1EW" },
                { id: "assign-3", initialSeat: "2EW" },
              ]),
            };
          } else if (selectCallCount === 4) {
            return {
              from: vi.fn().mockResolvedValue([
                { initialSeat: "1NS", player1: 1, player2: 2 },
                { initialSeat: "1EW", player1: 3, player2: 4 },
              ]),
            };
          } else if (selectCallCount === 5) {
            return {
              from: vi.fn().mockResolvedValue([
                { id: 1, firstName: "Alice", lastName: "Smith" },
                { id: 2, firstName: "Bob", lastName: "Jones" },
                { id: 3, firstName: "Carol", lastName: "Brown" },
                { id: 4, firstName: "Dave", lastName: "Wilson" },
              ]),
            };
          } else {
            return {
              from: vi
                .fn()
                .mockResolvedValue([
                  { roundNumber: 1 },
                  { roundNumber: 1 },
                  { roundNumber: 2 },
                  { roundNumber: 2 },
                  { roundNumber: 3 },
                ]),
            };
          }
        }),
      } as unknown as Db;

      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);

      const result = await getSchedule(mockDb, "1NS");

      expect(result).not.toBeNull();
      expect(result!.side).toBe("NS");
      expect(result!.assignmentId).toBe("assign-1");
      expect(result!.rounds).toHaveLength(3);
      expect(result!.rounds[0].roundNumber).toBe(1);
      expect(result!.rounds[0].boards).toEqual([1, 2]);
      // This pair is the NS assignment in both active rounds.
      expect(result!.rounds[0].side).toBe("NS");
      expect(result!.rounds[1].side).toBe("NS");
      expect(result!.rounds[1].roundNumber).toBe(2);
      expect(result!.rounds[2].roundNumber).toBe(3);
      expect(result!.rounds[2].sitOut).toBe(true);
      expect(result!.rounds[2].boards).toEqual([]);
    });

    it("marks a round whose boards are all SIT_OUT as a sit-out, keeping its table", async () => {
      let selectCallCount = 0;

      const mockDb = {
        select: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  get: vi
                    .fn()
                    .mockResolvedValue({ id: "assign-1", initialSeat: "1NS" }),
                }),
              }),
            };
          } else if (selectCallCount === 2) {
            // Round 1 played at table 1; round 2 is a sit-out at table 3
            // (both boards SIT_OUT).
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([
                  {
                    roundNumber: 1,
                    tableNumber: 1,
                    boardNumber: 1,
                    ns: "assign-1",
                    ew: "assign-2",
                    status: "NOT_PLAYED",
                  },
                  {
                    roundNumber: 2,
                    tableNumber: 3,
                    boardNumber: 3,
                    ns: "assign-1",
                    ew: "assign-9",
                    status: "SIT_OUT",
                  },
                  {
                    roundNumber: 2,
                    tableNumber: 3,
                    boardNumber: 4,
                    ns: "assign-1",
                    ew: "assign-9",
                    status: "SIT_OUT",
                  },
                ]),
              }),
            };
          } else if (selectCallCount === 3) {
            return {
              from: vi.fn().mockResolvedValue([
                { id: "assign-1", initialSeat: "1NS" },
                { id: "assign-2", initialSeat: "1EW" },
              ]),
            };
          } else if (selectCallCount === 4) {
            return {
              from: vi.fn().mockResolvedValue([
                { initialSeat: "1NS", player1: 1, player2: 2 },
              ]),
            };
          } else if (selectCallCount === 5) {
            return {
              from: vi.fn().mockResolvedValue([
                { id: 1, firstName: "Alice", lastName: "Smith" },
                { id: 2, firstName: "Bob", lastName: "Jones" },
              ]),
            };
          } else {
            return {
              from: vi
                .fn()
                .mockResolvedValue([{ roundNumber: 1 }, { roundNumber: 2 }]),
            };
          }
        }),
      } as unknown as Db;

      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);

      const result = await getSchedule(mockDb, "1NS");

      expect(result).not.toBeNull();
      const sitOutRound = result!.rounds.find((r) => r.roundNumber === 2)!;
      expect(sitOutRound.sitOut).toBe(true);
      expect(sitOutRound.tableNumber).toBe(3);
      expect(sitOutRound.boards).toEqual([]);
    });

    it("returns schedule with side EW for seat ending in EW", async () => {
      let selectCallCount = 0;

      const mockDb = {
        select: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  get: vi
                    .fn()
                    .mockResolvedValue({ id: "assign-2", initialSeat: "1EW" }),
                }),
              }),
            };
          } else if (selectCallCount === 2) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([
                  {
                    roundNumber: 1,
                    tableNumber: 1,
                    boardNumber: 1,
                    ns: "assign-1",
                    ew: "assign-2",
                    status: "NOT_PLAYED",
                  },
                ]),
              }),
            };
          } else if (selectCallCount === 3) {
            return {
              from: vi.fn().mockResolvedValue([
                { id: "assign-1", initialSeat: "1NS" },
                { id: "assign-2", initialSeat: "1EW" },
              ]),
            };
          } else if (selectCallCount === 4) {
            return { from: vi.fn().mockResolvedValue([]) };
          } else if (selectCallCount === 5) {
            return { from: vi.fn().mockResolvedValue([]) };
          } else {
            return { from: vi.fn().mockResolvedValue([{ roundNumber: 1 }]) };
          }
        }),
      } as unknown as Db;

      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);

      const result = await getSchedule(mockDb, "1EW");

      expect(result).not.toBeNull();
      expect(result!.side).toBe("EW");
      expect(result!.assignmentId).toBe("assign-2");
      // This pair is the EW assignment for the round.
      expect(result!.rounds[0].side).toBe("EW");
    });

    it("skips participants with a missing player or blank seat, and assignments with no seat", async () => {
      let selectCallCount = 0;

      const mockDb = {
        select: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  get: vi
                    .fn()
                    .mockResolvedValue({ id: "assign-1", initialSeat: "1NS" }),
                }),
              }),
            };
          } else if (selectCallCount === 2) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([
                  {
                    roundNumber: 1,
                    tableNumber: 1,
                    boardNumber: 1,
                    ns: "assign-1",
                    ew: "assign-2",
                    status: "NOT_PLAYED",
                  },
                ]),
              }),
            };
          } else if (selectCallCount === 3) {
            // Assignment rows: one has a null initialSeat, exercising the
            // `initialSeat ? ... : undefined` false branch (lines 84-85).
            return {
              from: vi.fn().mockResolvedValue([
                { id: "assign-1", initialSeat: "1NS" },
                { id: "assign-2", initialSeat: "1EW" },
                { id: "assign-3", initialSeat: null },
              ]),
            };
          } else if (selectCallCount === 4) {
            // Participants exercising the line-74 guard false branches:
            //  - player1 id references a missing player (p1 undefined)
            //  - blank initialSeat
            //  - a fully valid one so the truthy branch is still hit
            return {
              from: vi.fn().mockResolvedValue([
                { initialSeat: "1NS", player1: 1, player2: 2 },
                { initialSeat: "1EW", player1: 999, player2: 4 },
                { initialSeat: "", player1: 1, player2: 2 },
              ]),
            };
          } else if (selectCallCount === 5) {
            return {
              from: vi.fn().mockResolvedValue([
                { id: 1, firstName: "Alice", lastName: "Smith" },
                { id: 2, firstName: "Bob", lastName: "Jones" },
                { id: 4, firstName: "Dave", lastName: "Wilson" },
              ]),
            };
          } else {
            return {
              from: vi.fn().mockResolvedValue([{ roundNumber: 1 }]),
            };
          }
        }),
      } as unknown as Db;

      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);

      const result = await getSchedule(mockDb, "1NS");

      expect(result).not.toBeNull();
      // NS pair (assign-1 -> 1NS) resolves both players; EW pair (assign-2 ->
      // 1EW) has a missing player1 so it is dropped -> E/W stay null.
      expect(result!.rounds[0].players.N).toMatchObject({ firstName: "Alice" });
      expect(result!.rounds[0].players.E).toBeNull();
      expect(result!.rounds[0].players.W).toBeNull();
    });

    it("reports zero total rounds when the game has no boards at all", async () => {
      let selectCallCount = 0;

      const mockDb = {
        select: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  get: vi
                    .fn()
                    .mockResolvedValue({ id: "assign-1", initialSeat: "1NS" }),
                }),
              }),
            };
          } else if (selectCallCount === 2) {
            // This pair has no board rows.
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([]),
              }),
            };
          } else if (selectCallCount === 3) {
            return { from: vi.fn().mockResolvedValue([]) };
          } else if (selectCallCount === 4) {
            return { from: vi.fn().mockResolvedValue([]) };
          } else if (selectCallCount === 5) {
            return { from: vi.fn().mockResolvedValue([]) };
          } else {
            // No game boards at all -> allRoundNumbers.size === 0 -> totalRounds 0.
            return { from: vi.fn().mockResolvedValue([]) };
          }
        }),
      } as unknown as Db;

      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);

      const result = await getSchedule(mockDb, "1NS");

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
     * Build a mock db for one pair's schedule from its board rows, resolving
     * three pairs' names (anchor "A1NS", opp1 "A2NS", opp2 "A1EW"), over a
     * single round.
     */
    function makeDb(seat: string, assignmentId: string, pairRows: Row[]): Db {
      let n = 0;
      return {
        select: vi.fn().mockImplementation(() => {
          n++;
          if (n === 1) {
            return {
              from: () => ({
                where: () => ({
                  get: () =>
                    Promise.resolve({ id: assignmentId, initialSeat: seat }),
                }),
              }),
            };
          }
          if (n === 2) {
            return { from: () => ({ where: () => Promise.resolve(pairRows) }) };
          }
          if (n === 3) {
            return {
              from: () =>
                Promise.resolve([
                  { id: "aA1NS", initialSeat: "A1NS" },
                  { id: "aA2NS", initialSeat: "A2NS" },
                  { id: "aA1EW", initialSeat: "A1EW" },
                ]),
            };
          }
          if (n === 4) {
            return {
              from: () =>
                Promise.resolve([
                  { initialSeat: "A1NS", player1: 1, player2: 2 },
                  { initialSeat: "A2NS", player1: 3, player2: 4 },
                  { initialSeat: "A1EW", player1: 5, player2: 6 },
                ]),
            };
          }
          if (n === 5) {
            return {
              from: () =>
                Promise.resolve([
                  { id: 1, firstName: "An", lastName: "Chor" },
                  { id: 2, firstName: "An2", lastName: "Chor2" },
                  { id: 3, firstName: "Op", lastName: "One" },
                  { id: 4, firstName: "Op2", lastName: "One2" },
                  { id: 5, firstName: "Op", lastName: "Two" },
                  { id: 6, firstName: "Op2", lastName: "Two2" },
                ]),
            };
          }
          return { from: () => Promise.resolve([{ roundNumber: 1 }]) };
        }),
      } as unknown as Db;
    }

    it("gives the anchor two segments (one per opponent) across the midpoint", async () => {
      // Anchor A1NS plays opp1 (A2NS) on boards 1-2, opp2 (A1EW) on boards 3-4.
      const rows: Row[] = [
        { roundNumber: 1, tableNumber: 1, boardNumber: 1, ns: "aA1NS", ew: "aA2NS", status: "CONFIRMED" },
        { roundNumber: 1, tableNumber: 1, boardNumber: 2, ns: "aA1NS", ew: "aA2NS", status: "CONFIRMED" },
        { roundNumber: 1, tableNumber: 1, boardNumber: 3, ns: "aA1NS", ew: "aA1EW", status: "NOT_PLAYED" },
        { roundNumber: 1, tableNumber: 1, boardNumber: 4, ns: "aA1NS", ew: "aA1EW", status: "NOT_PLAYED" },
      ];
      const db = makeDb("A1NS", "aA1NS", rows);
      vi.mocked(getPairsDb).mockResolvedValue(db as any);

      const result = await getSchedule(db, "A1NS");
      const round = result!.rounds[0];

      expect(round.sitOut).toBeFalsy();
      expect(round.halfMatch?.role).toBe("anchor");
      expect(round.halfMatch?.segments).toHaveLength(2);
      expect(round.halfMatch?.segments[0]).toMatchObject({ half: "first", boards: [1, 2] });
      expect(round.halfMatch?.segments[1]).toMatchObject({ half: "second", boards: [3, 4] });
      // The anchor still plays all four boards (full board set for ContractWizard).
      expect(round.boards).toEqual([1, 2, 3, 4]);
    });

    it("gives a first-half non-anchor one segment and excludes its compensated boards", async () => {
      // Opp1 (A2NS) plays the FIRST half (boards 1-2) vs the anchor, and is
      // compensated (HALF_AVERAGE) on boards 3-4.
      const rows: Row[] = [
        { roundNumber: 1, tableNumber: 1, boardNumber: 1, ns: "aA1NS", ew: "aA2NS", status: "CONFIRMED" },
        { roundNumber: 1, tableNumber: 1, boardNumber: 2, ns: "aA1NS", ew: "aA2NS", status: "CONFIRMED" },
        { roundNumber: 1, tableNumber: 7, boardNumber: 3, ns: "aA2NS", ew: "PHANTOM", status: "HALF_AVERAGE" },
        { roundNumber: 1, tableNumber: 7, boardNumber: 4, ns: "aA2NS", ew: "PHANTOM", status: "HALF_AVERAGE" },
      ];
      const db = makeDb("A2NS", "aA2NS", rows);
      vi.mocked(getPairsDb).mockResolvedValue(db as any);

      const result = await getSchedule(db, "A2NS");
      const round = result!.rounds[0];

      expect(round.halfMatch?.role).toBe("firstHalf");
      expect(round.halfMatch?.segments).toHaveLength(1);
      expect(round.halfMatch?.segments[0]).toMatchObject({ half: "first", boards: [1, 2] });
      // Compensated boards 3-4 are NOT playable boards for this pair.
      expect(round.boards).toEqual([1, 2]);
    });

    it("gives a second-half non-anchor one segment with the second-half marker", async () => {
      // Opp2 (A1EW) plays the SECOND half (boards 3-4) vs the anchor, and is
      // compensated on boards 1-2.
      const rows: Row[] = [
        { roundNumber: 1, tableNumber: 8, boardNumber: 1, ns: "aA1EW", ew: "PHANTOM", status: "HALF_AVERAGE" },
        { roundNumber: 1, tableNumber: 8, boardNumber: 2, ns: "aA1EW", ew: "PHANTOM", status: "HALF_AVERAGE" },
        { roundNumber: 1, tableNumber: 1, boardNumber: 3, ns: "aA1NS", ew: "aA1EW", status: "NOT_PLAYED" },
        { roundNumber: 1, tableNumber: 1, boardNumber: 4, ns: "aA1NS", ew: "aA1EW", status: "NOT_PLAYED" },
      ];
      const db = makeDb("A1EW", "aA1EW", rows);
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
