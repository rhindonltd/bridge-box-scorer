import { describe, it, expect, vi, beforeEach } from "vitest";
import { getBoardInstances } from "./board-service";

vi.mock("@/db/games/pairs", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/db/games/individual", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/db/games/pairs/tables/boards", () => ({
  boards: { boardNumber: "boardNumber" },
}));

vi.mock("@/db/games/individual/tables/boards", () => ({
  boards: { boardNumber: "boardNumber" },
}));

vi.mock("@/db/games/pairs/queries/find-pairs", () => ({
  findPairs: vi.fn(),
}));

vi.mock("@/db/games/individual/queries/find-individuals", () => ({
  findIndividuals: vi.fn(),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => args),
}));

import { getDb as getPairsDb } from "@/db/games/pairs";
import { getDb as getIndividualDb } from "@/db/games/individual";
import { findPairs } from "@/db/games/pairs/queries/find-pairs";
import { findIndividuals } from "@/db/games/individual/queries/find-individuals";

describe("board-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getBoardInstances (PAIRS)", () => {
    it("returns instances with participant names and current result", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { roundNumber: 1, tableNumber: 1, boardNumber: 7, ns: "1NS", ew: "2EW", confirmedResult: "3NTN=", directorOverrideResult: null, status: "CONFIRMED" },
              { roundNumber: 2, tableNumber: 3, boardNumber: 7, ns: "3NS", ew: "1NS", confirmedResult: null, directorOverrideResult: null, status: "NOT_PLAYED" },
            ]),
          }),
        }),
      };
      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);

      vi.mocked(findPairs).mockResolvedValue([
        { initialSeat: "1NS", type: "PAIR", player1: { id: 1, firstName: "Alice", lastName: "Smith", nationalId: null }, player2: { id: 2, firstName: "Bob", lastName: "Jones", nationalId: null } },
        { initialSeat: "2EW", type: "PAIR", player1: { id: 3, firstName: "Carol", lastName: "Brown", nationalId: null }, player2: { id: 4, firstName: "Dave", lastName: "Wilson", nationalId: null } },
        { initialSeat: "3NS", type: "PAIR", player1: { id: 5, firstName: "Eve", lastName: "Green", nationalId: null }, player2: { id: 6, firstName: "Frank", lastName: "White", nationalId: null } },
      ] as any);

      const result = await getBoardInstances("game-1", "PAIRS", 7);

      expect(result).toHaveLength(2);
      expect(result[0].currentResult).toBe("3NTN=");
      expect(result[0].participants.type).toBe("PAIRS");
      if (result[0].participants.type === "PAIRS") {
        expect(result[0].participants.nsNames).toBe("Alice Smith & Bob Jones");
        expect(result[0].participants.ewNames).toBe("Carol Brown & Dave Wilson");
      }
      expect(result[1].currentResult).toBeNull();
      if (result[1].participants.type === "PAIRS") {
        expect(result[1].participants.nsNames).toBe("Eve Green & Frank White");
      }
    });

    it("uses director override when available", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { roundNumber: 1, tableNumber: 1, boardNumber: 5, ns: "1NS", ew: "2EW", confirmedResult: "3NTN=", directorOverrideResult: "3NTN+1", status: "OVERRIDDEN" },
            ]),
          }),
        }),
      };
      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);

      vi.mocked(findPairs).mockResolvedValue([]);

      const result = await getBoardInstances("game-1", "PAIRS", 5);

      expect(result[0].currentResult).toBe("3NTN+1");
    });

    it("returns null names when pair not found in lookup", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { roundNumber: 1, tableNumber: 1, boardNumber: 1, ns: "99NS", ew: "88EW", confirmedResult: null, directorOverrideResult: null, status: "NOT_PLAYED" },
            ]),
          }),
        }),
      };
      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);

      vi.mocked(findPairs).mockResolvedValue([]);

      const result = await getBoardInstances("game-1", "PAIRS", 1);

      expect(result[0].participants.type).toBe("PAIRS");
      if (result[0].participants.type === "PAIRS") {
        expect(result[0].participants.nsNames).toBeNull();
        expect(result[0].participants.ewNames).toBeNull();
      }
    });
  });

  describe("getBoardInstances (INDIVIDUAL)", () => {
    it("returns instances with individual player names", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { roundNumber: 1, tableNumber: 1, boardNumber: 3, n: "1N", s: "1S", e: "1E", w: "1W", confirmedResult: "4HE+1", directorOverrideResult: null, status: "CONFIRMED" },
            ]),
          }),
        }),
      };
      vi.mocked(getIndividualDb).mockResolvedValue(mockDb as any);

      vi.mocked(findIndividuals).mockResolvedValue([
        { type: "INDIVIDUAL", initialSeat: "1N", player: { id: 1, firstName: "Alice", lastName: "Smith", nationalId: null } },
        { type: "INDIVIDUAL", initialSeat: "1S", player: { id: 2, firstName: "Bob", lastName: "Jones", nationalId: null } },
        { type: "INDIVIDUAL", initialSeat: "1E", player: { id: 3, firstName: "Carol", lastName: "Brown", nationalId: null } },
        { type: "INDIVIDUAL", initialSeat: "1W", player: { id: 4, firstName: "Dave", lastName: "Wilson", nationalId: null } },
      ] as any);

      const result = await getBoardInstances("game-1", "INDIVIDUAL", 3);

      expect(result).toHaveLength(1);
      expect(result[0].currentResult).toBe("4HE+1");
      expect(result[0].participants.type).toBe("INDIVIDUAL");
      if (result[0].participants.type === "INDIVIDUAL") {
        expect(result[0].participants.nName).toBe("Alice Smith");
        expect(result[0].participants.sName).toBe("Bob Jones");
        expect(result[0].participants.eName).toBe("Carol Brown");
        expect(result[0].participants.wName).toBe("Dave Wilson");
      }
    });

    it("returns null for currentResult when neither confirmed nor override exists", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { roundNumber: 1, tableNumber: 1, boardNumber: 1, n: "1N", s: "1S", e: "1E", w: "1W", confirmedResult: null, directorOverrideResult: null, status: "NOT_PLAYED" },
            ]),
          }),
        }),
      };
      vi.mocked(getIndividualDb).mockResolvedValue(mockDb as any);

      vi.mocked(findIndividuals).mockResolvedValue([]);

      const result = await getBoardInstances("game-1", "INDIVIDUAL", 1);

      expect(result[0].currentResult).toBeNull();
    });
  });
});
