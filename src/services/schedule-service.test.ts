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
    });
  });
});
