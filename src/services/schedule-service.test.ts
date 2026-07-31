import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPlayerSchedule } from "./schedule-service";

vi.mock("@/db/games/pairs", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/db/games/individual", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/db/games/pairs/tables/boards", () => ({
  boards: { ns: "ns", ew: "ew", roundNumber: "roundNumber", boardNumber: "boardNumber" },
}));

vi.mock("@/db/games/individual/tables/boards", () => ({
  boards: { n: "n", s: "s", e: "e", w: "w", roundNumber: "roundNumber", boardNumber: "boardNumber" },
}));

vi.mock("@/db/games/pairs/tables/assignments", () => ({
  assignments: { initialSeat: "initialSeat", id: "id" },
}));

vi.mock("@/db/games/individual/tables/assignments", () => ({
  assignments: { initialSeat: "initialSeat", id: "id" },
}));

vi.mock("@/db/games/pairs/tables/participants", () => ({
  participants: "pairParticipants",
}));

vi.mock("@/db/games/individual/tables/participants", () => ({
  participants: "individualParticipants",
}));

vi.mock("@/db/games/shared/tables/players", () => ({
  players: "players",
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => args),
  or: vi.fn((...args: any[]) => args),
}));

import { getDb as getPairsDb } from "@/db/games/pairs";
import { getDb as getIndividualDb } from "@/db/games/individual";

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
      };
      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);

      const result = await getPlayerSchedule("game-1", "PAIRS", "99NS");

      expect(result).toBeNull();
    });

    it("returns schedule with side NS for seat ending in NS", async () => {
      // We need to build a more complex mock to handle multiple select() calls
      let selectCallCount = 0;

      const mockDb = {
        select: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) {
            // Assignment lookup: select().from(assignments).where(...).get()
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  get: vi.fn().mockResolvedValue({ id: "assign-1", initialSeat: "1NS" }),
                }),
              }),
            };
          } else if (selectCallCount === 2) {
            // Boards query: select().from(pairsBoards).where(or(...))
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([
                  { roundNumber: 1, tableNumber: 1, boardNumber: 1, ns: "assign-1", ew: "assign-2", status: "CONFIRMED" },
                  { roundNumber: 1, tableNumber: 1, boardNumber: 2, ns: "assign-1", ew: "assign-2", status: "NOT_PLAYED" },
                  { roundNumber: 2, tableNumber: 2, boardNumber: 3, ns: "assign-1", ew: "assign-3", status: "NOT_PLAYED" },
                ]),
              }),
            };
          } else if (selectCallCount === 3) {
            // All assignments
            return {
              from: vi.fn().mockResolvedValue([
                { id: "assign-1", initialSeat: "1NS" },
                { id: "assign-2", initialSeat: "1EW" },
                { id: "assign-3", initialSeat: "2EW" },
              ]),
            };
          } else if (selectCallCount === 4) {
            // Participants
            return {
              from: vi.fn().mockResolvedValue([
                { initialSeat: "1NS", player1: 1, player2: 2 },
                { initialSeat: "1EW", player1: 3, player2: 4 },
              ]),
            };
          } else if (selectCallCount === 5) {
            // Players
            return {
              from: vi.fn().mockResolvedValue([
                { id: 1, firstName: "Alice", lastName: "Smith" },
                { id: 2, firstName: "Bob", lastName: "Jones" },
                { id: 3, firstName: "Carol", lastName: "Brown" },
                { id: 4, firstName: "Dave", lastName: "Wilson" },
              ]),
            };
          } else {
            // All game boards for total rounds: select({ roundNumber }).from(pairsBoards)
            return {
              from: vi.fn().mockResolvedValue([
                { roundNumber: 1 },
                { roundNumber: 1 },
                { roundNumber: 2 },
                { roundNumber: 2 },
                { roundNumber: 3 },
              ]),
            };
          }
        }),
      };

      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);

      const result = await getPlayerSchedule("game-1", "PAIRS", "1NS");

      expect(result).not.toBeNull();
      expect(result!.side).toBe("NS");
      expect(result!.assignmentId).toBe("assign-1");
      // Player appears in rounds 1 and 2 but not 3 → round 3 is a sit-out
      expect(result!.rounds).toHaveLength(3);
      expect(result!.rounds[0].roundNumber).toBe(1);
      expect(result!.rounds[0].boards).toEqual([1, 2]);
      expect(result!.rounds[1].roundNumber).toBe(2);
      expect(result!.rounds[2].roundNumber).toBe(3);
      expect(result!.rounds[2].sitOut).toBe(true);
      expect(result!.rounds[2].boards).toEqual([]);
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
                  get: vi.fn().mockResolvedValue({ id: "assign-2", initialSeat: "1EW" }),
                }),
              }),
            };
          } else if (selectCallCount === 2) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([
                  { roundNumber: 1, tableNumber: 1, boardNumber: 1, ns: "assign-1", ew: "assign-2", status: "NOT_PLAYED" },
                ]),
              }),
            };
          } else if (selectCallCount === 3) {
            return { from: vi.fn().mockResolvedValue([{ id: "assign-1", initialSeat: "1NS" }, { id: "assign-2", initialSeat: "1EW" }]) };
          } else if (selectCallCount === 4) {
            return { from: vi.fn().mockResolvedValue([]) };
          } else if (selectCallCount === 5) {
            return { from: vi.fn().mockResolvedValue([]) };
          } else {
            return { from: vi.fn().mockResolvedValue([{ roundNumber: 1 }]) };
          }
        }),
      };

      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);

      const result = await getPlayerSchedule("game-1", "PAIRS", "1EW");

      expect(result).not.toBeNull();
      expect(result!.side).toBe("EW");
      expect(result!.assignmentId).toBe("assign-2");
    });
  });

  describe("getPlayerSchedule (INDIVIDUAL)", () => {
    it("returns null when assignment not found", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        }),
      };
      vi.mocked(getIndividualDb).mockResolvedValue(mockDb as any);

      const result = await getPlayerSchedule("game-1", "INDIVIDUAL", "99N");

      expect(result).toBeNull();
    });

    it("returns schedule with side NS for N seat", async () => {
      let selectCallCount = 0;

      const mockDb = {
        select: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) {
            // Assignment lookup
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  get: vi.fn().mockResolvedValue({ id: "assign-N1", initialSeat: "1N" }),
                }),
              }),
            };
          } else if (selectCallCount === 2) {
            // Boards where player appears
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([
                  { roundNumber: 1, tableNumber: 1, boardNumber: 1, n: "assign-N1", s: "assign-S1", e: "assign-E1", w: "assign-W1", status: "NOT_PLAYED" },
                ]),
              }),
            };
          } else if (selectCallCount === 3) {
            // All assignments
            return {
              from: vi.fn().mockResolvedValue([
                { id: "assign-N1", initialSeat: "1N" },
                { id: "assign-S1", initialSeat: "1S" },
                { id: "assign-E1", initialSeat: "1E" },
                { id: "assign-W1", initialSeat: "1W" },
              ]),
            };
          } else if (selectCallCount === 4) {
            // Participants
            return {
              from: vi.fn().mockResolvedValue([
                { initialSeat: "1N", player: 1 },
                { initialSeat: "1S", player: 2 },
                { initialSeat: "1E", player: 3 },
                { initialSeat: "1W", player: 4 },
              ]),
            };
          } else if (selectCallCount === 5) {
            // Players
            return {
              from: vi.fn().mockResolvedValue([
                { id: 1, firstName: "Alice", lastName: "North" },
                { id: 2, firstName: "Bob", lastName: "South" },
                { id: 3, firstName: "Carol", lastName: "East" },
                { id: 4, firstName: "Dave", lastName: "West" },
              ]),
            };
          } else {
            // All game boards for total rounds
            return {
              from: vi.fn().mockResolvedValue([{ roundNumber: 1 }]),
            };
          }
        }),
      };

      vi.mocked(getIndividualDb).mockResolvedValue(mockDb as any);

      const result = await getPlayerSchedule("game-1", "INDIVIDUAL", "1N");

      expect(result).not.toBeNull();
      expect(result!.side).toBe("NS");
      expect(result!.assignmentId).toBe("assign-N1");
      expect(result!.rounds).toHaveLength(1);
      expect(result!.rounds[0].roundNumber).toBe(1);
    });

    it("detects sit-out rounds", async () => {
      let selectCallCount = 0;

      const mockDb = {
        select: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  get: vi.fn().mockResolvedValue({ id: "assign-N1", initialSeat: "1N" }),
                }),
              }),
            };
          } else if (selectCallCount === 2) {
            // Player only appears in round 1, not round 2
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([
                  { roundNumber: 1, tableNumber: 1, boardNumber: 1, n: "assign-N1", s: "assign-S1", e: "assign-E1", w: "assign-W1", status: "NOT_PLAYED" },
                ]),
              }),
            };
          } else if (selectCallCount === 3) {
            return { from: vi.fn().mockResolvedValue([{ id: "assign-N1", initialSeat: "1N" }]) };
          } else if (selectCallCount === 4) {
            return { from: vi.fn().mockResolvedValue([{ initialSeat: "1N", player: 1 }]) };
          } else if (selectCallCount === 5) {
            return { from: vi.fn().mockResolvedValue([{ id: 1, firstName: "Alice", lastName: "North" }]) };
          } else {
            // Total rounds: 1 and 2 exist in the game
            return {
              from: vi.fn().mockResolvedValue([{ roundNumber: 1 }, { roundNumber: 2 }]),
            };
          }
        }),
      };

      vi.mocked(getIndividualDb).mockResolvedValue(mockDb as any);

      const result = await getPlayerSchedule("game-1", "INDIVIDUAL", "1N");

      expect(result!.rounds).toHaveLength(2);
      expect(result!.rounds[0].roundNumber).toBe(1);
      expect(result!.rounds[0].sitOut).toBeUndefined();
      expect(result!.rounds[1].roundNumber).toBe(2);
      expect(result!.rounds[1].sitOut).toBe(true);
      expect(result!.rounds[1].boards).toEqual([]);
    });
  });
});
