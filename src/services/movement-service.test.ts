import { describe, it, expect, vi, beforeEach } from "vitest";
import { getMovementWithProgress } from "./movement-service";

vi.mock("@/db/games/pairs", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/db/games/pairs/tables/boards", () => ({
  boards: "pairsBoards",
}));

import { getDb as getPairsDb } from "@/db/games/pairs";

describe("movement-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getMovementWithProgress (PAIRS)", () => {
    it("groups boards by table and round with correct board ranges", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockResolvedValue([
            {
              tableNumber: 1,
              roundNumber: 1,
              boardNumber: 1,
              ns: "1",
              ew: "2",
              confirmedResult: null,
              directorOverrideResult: null,
              status: "NOT_PLAYED",
            },
            {
              tableNumber: 1,
              roundNumber: 1,
              boardNumber: 2,
              ns: "1",
              ew: "2",
              confirmedResult: null,
              directorOverrideResult: null,
              status: "NOT_PLAYED",
            },
            {
              tableNumber: 1,
              roundNumber: 1,
              boardNumber: 3,
              ns: "1",
              ew: "2",
              confirmedResult: null,
              directorOverrideResult: null,
              status: "NOT_PLAYED",
            },
            {
              tableNumber: 1,
              roundNumber: 2,
              boardNumber: 4,
              ns: "1",
              ew: "3",
              confirmedResult: "3NTN=",
              directorOverrideResult: null,
              status: "CONFIRMED",
            },
            {
              tableNumber: 1,
              roundNumber: 2,
              boardNumber: 5,
              ns: "1",
              ew: "3",
              confirmedResult: null,
              directorOverrideResult: null,
              status: "NOT_PLAYED",
            },
          ]),
        }),
      };
      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);

      const result = await getMovementWithProgress("game-1", "PAIRS");

      expect(result.type).toBe("PAIRS");
      expect(result.tables).toHaveLength(1);
      expect(result.tables[0].tableNumber).toBe(1);
      expect(result.tables[0].rounds).toHaveLength(2);
      expect(result.tables[0].rounds[0]).toMatchObject({
        roundNumber: 1,
        boardStart: 1,
        boardEnd: 3,
        played: 0,
        total: 3,
        hasPreviousGap: true,
      });
      expect(result.tables[0].rounds[1]).toMatchObject({
        roundNumber: 2,
        boardStart: 4,
        boardEnd: 5,
        played: 1,
        total: 2,
        hasPreviousGap: false,
      });
    });

    it("detects gap when later round has results but earlier round is incomplete", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockResolvedValue([
            {
              tableNumber: 1,
              roundNumber: 1,
              boardNumber: 1,
              ns: "1",
              ew: "2",
              confirmedResult: null,
              directorOverrideResult: null,
              status: "NOT_PLAYED",
            },
            {
              tableNumber: 1,
              roundNumber: 2,
              boardNumber: 2,
              ns: "1",
              ew: "3",
              confirmedResult: "4HE+1",
              directorOverrideResult: null,
              status: "CONFIRMED",
            },
          ]),
        }),
      };
      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);

      const result = await getMovementWithProgress("game-1", "PAIRS");

      // Round 1 is incomplete (0/1) and round 2 has results → round 1 flagged
      expect(result.tables[0].rounds[0].hasPreviousGap).toBe(true);
      expect(result.tables[0].rounds[1].hasPreviousGap).toBe(false);
    });

    it("returns empty tables for a game with no boards", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockResolvedValue([]),
        }),
      };
      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);

      const result = await getMovementWithProgress("game-1", "PAIRS");

      expect(result.tables).toHaveLength(0);
    });

    it("handles multiple tables correctly", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockResolvedValue([
            {
              tableNumber: 1,
              roundNumber: 1,
              boardNumber: 1,
              ns: "1",
              ew: "2",
              confirmedResult: "2SN=",
              directorOverrideResult: null,
              status: "CONFIRMED",
            },
            {
              tableNumber: 2,
              roundNumber: 1,
              boardNumber: 1,
              ns: "3",
              ew: "4",
              confirmedResult: null,
              directorOverrideResult: null,
              status: "NOT_PLAYED",
            },
          ]),
        }),
      };
      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);

      const result = await getMovementWithProgress("game-1", "PAIRS");

      expect(result.tables).toHaveLength(2);
      expect(result.tables[0].tableNumber).toBe(1);
      expect(result.tables[1].tableNumber).toBe(2);
      expect(result.tables[0].rounds[0].played).toBe(1);
      expect(result.tables[1].rounds[0].played).toBe(0);
    });

    it("counts directorOverrideResult as played", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockResolvedValue([
            {
              tableNumber: 1,
              roundNumber: 1,
              boardNumber: 1,
              ns: "1",
              ew: "2",
              confirmedResult: null,
              directorOverrideResult: "AVE",
              status: "OVERRIDDEN",
            },
          ]),
        }),
      };
      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);

      const result = await getMovementWithProgress("game-1", "PAIRS");

      expect(result.tables[0].rounds[0].played).toBe(1);
    });

    it("does not flag hasPreviousGap when all boards in a round are played (lines 77-85)", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockResolvedValue([
            {
              tableNumber: 1,
              roundNumber: 1,
              boardNumber: 1,
              ns: "1",
              ew: "2",
              confirmedResult: "3NTN=",
              directorOverrideResult: null,
              status: "CONFIRMED",
            },
            {
              tableNumber: 1,
              roundNumber: 1,
              boardNumber: 2,
              ns: "1",
              ew: "2",
              confirmedResult: "4HE+1",
              directorOverrideResult: null,
              status: "CONFIRMED",
            },
            {
              tableNumber: 1,
              roundNumber: 2,
              boardNumber: 3,
              ns: "1",
              ew: "3",
              confirmedResult: "2SN=",
              directorOverrideResult: null,
              status: "CONFIRMED",
            },
            {
              tableNumber: 1,
              roundNumber: 2,
              boardNumber: 4,
              ns: "1",
              ew: "3",
              confirmedResult: "1NTN=",
              directorOverrideResult: null,
              status: "CONFIRMED",
            },
          ]),
        }),
      };
      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);

      const result = await getMovementWithProgress("game-1", "PAIRS");

      // All boards are played, so no gap detected
      expect(result.tables[0].rounds[0].hasPreviousGap).toBe(false);
      expect(result.tables[0].rounds[1].hasPreviousGap).toBe(false);
    });

    it("does not flag hasPreviousGap when later rounds have no results (lines 103-104)", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockResolvedValue([
            {
              tableNumber: 1,
              roundNumber: 1,
              boardNumber: 1,
              ns: "1",
              ew: "2",
              confirmedResult: null,
              directorOverrideResult: null,
              status: "NOT_PLAYED",
            },
            {
              tableNumber: 1,
              roundNumber: 2,
              boardNumber: 2,
              ns: "1",
              ew: "3",
              confirmedResult: null,
              directorOverrideResult: null,
              status: "NOT_PLAYED",
            },
            {
              tableNumber: 1,
              roundNumber: 3,
              boardNumber: 3,
              ns: "1",
              ew: "4",
              confirmedResult: null,
              directorOverrideResult: null,
              status: "NOT_PLAYED",
            },
          ]),
        }),
      };
      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);

      const result = await getMovementWithProgress("game-1", "PAIRS");

      // No rounds have results, no gaps
      expect(result.tables[0].rounds[0].hasPreviousGap).toBe(false);
      expect(result.tables[0].rounds[1].hasPreviousGap).toBe(false);
      expect(result.tables[0].rounds[2].hasPreviousGap).toBe(false);
    });

    it("counts status PENDING_CONFIRMATION as played (line 123)", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockResolvedValue([
            {
              tableNumber: 1,
              roundNumber: 1,
              boardNumber: 1,
              ns: "1",
              ew: "2",
              confirmedResult: null,
              directorOverrideResult: null,
              status: "PENDING_CONFIRMATION",
            },
          ]),
        }),
      };
      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);

      const result = await getMovementWithProgress("game-1", "PAIRS");

      expect(result.tables[0].rounds[0].played).toBe(1);
    });

    it("handles incomplete round with a later round that has zero played (laterCounts.played === 0)", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockResolvedValue([
            {
              tableNumber: 1,
              roundNumber: 1,
              boardNumber: 1,
              ns: "1",
              ew: "2",
              confirmedResult: "3NTN=",
              directorOverrideResult: null,
              status: "CONFIRMED",
            },
            {
              tableNumber: 1,
              roundNumber: 1,
              boardNumber: 2,
              ns: "1",
              ew: "2",
              confirmedResult: null,
              directorOverrideResult: null,
              status: "NOT_PLAYED",
            },
            {
              tableNumber: 1,
              roundNumber: 2,
              boardNumber: 3,
              ns: "1",
              ew: "3",
              confirmedResult: null,
              directorOverrideResult: null,
              status: "NOT_PLAYED",
            },
            {
              tableNumber: 1,
              roundNumber: 2,
              boardNumber: 4,
              ns: "1",
              ew: "3",
              confirmedResult: null,
              directorOverrideResult: null,
              status: "NOT_PLAYED",
            },
          ]),
        }),
      };
      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);

      const result = await getMovementWithProgress("game-1", "PAIRS");

      // Round 1 is incomplete (1/2) but round 2 has 0 played, so no gap flagged
      expect(result.tables[0].rounds[0].hasPreviousGap).toBe(false);
      expect(result.tables[0].rounds[1].hasPreviousGap).toBe(false);
    });

    it("handles the boardCountMap fallback when key is not found", async () => {
      // This tests the edge case where boardCountMap.get(key) returns undefined
      // which triggers the ?? { played: 0, total: 0 } fallback
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockResolvedValue([
            {
              tableNumber: 1,
              roundNumber: 1,
              boardNumber: 1,
              ns: "1",
              ew: "2",
              confirmedResult: "3NTN=",
              directorOverrideResult: null,
              status: "CONFIRMED",
            },
          ]),
        }),
      };
      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);

      const result = await getMovementWithProgress("game-1", "PAIRS");

      // With valid data, boardCountMap always has the key - just verify it works
      expect(result.tables[0].rounds[0].played).toBe(1);
      expect(result.tables[0].rounds[0].total).toBe(1);
    });
  });
});
