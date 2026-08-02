import { describe, it, expect, vi, beforeEach } from "vitest";
import { computeLeaderboard } from "./leaderboard-service";
import { BridgeGame } from "@/db/game-index/schema";

vi.mock("@/db/games/pairs", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/db/games/pairs/tables/boards", () => ({
  boards: "pairsBoards",
}));

vi.mock("@/db/games/pairs/queries/find-pairs", () => ({
  findPairs: vi.fn(),
}));

vi.mock("@/scoring/traveller/score-traveller", () => ({
  score: vi.fn(),
}));

vi.mock("@/scoring/overall/pair/mp", () => ({
  calculateOverallMPResults: vi.fn(),
}));

vi.mock("@/scoring/overall/pair/x-imp", () => ({
  calculateOverallXIMPResults: vi.fn(),
}));

import { getDb as getPairsDb } from "@/db/games/pairs";
import { findPairs } from "@/db/games/pairs/queries/find-pairs";
import { score } from "@/scoring/traveller/score-traveller";
import { calculateOverallMPResults } from "@/scoring/overall/pair/mp";
import { calculateOverallXIMPResults as calculatePairXIMPResults } from "@/scoring/overall/pair/x-imp";

describe("leaderboard-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PAIRS + MP", () => {
    it("computes pairs MP leaderboard from confirmed results", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockResolvedValue([
            {
              boardNumber: 1,
              ns: "1",
              ew: "2",
              confirmedResult: "3NTN=",
              directorOverrideResult: null,
            },
            {
              boardNumber: 1,
              ns: "3",
              ew: "4",
              confirmedResult: "3NTN+1",
              directorOverrideResult: null,
            },
          ]),
        }),
      };
      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);

      vi.mocked(score).mockReturnValue({
        type: "PAIR_MP",
        board: 1,
        lines: [
          {
            nsId: "1",
            ewId: "2",
            nsMatchPoints: 0,
            ewMatchPoints: 2,
            maxMatchPoints: 2,
          },
          {
            nsId: "3",
            ewId: "4",
            nsMatchPoints: 2,
            ewMatchPoints: 0,
            maxMatchPoints: 2,
          },
        ],
      } as any);

      vi.mocked(calculateOverallMPResults).mockReturnValue({
        type: "PAIR_MP",
        mode: "PAIR",
        scoring: "MP",
        lines: [
          { pairId: "3", totalMP: 2, maxMP: 2 },
          { pairId: "1", totalMP: 0, maxMP: 2 },
        ],
      } as any);

      vi.mocked(findPairs).mockResolvedValue([
        {
          initialSeat: "1NS",
          type: "PAIR",
          player1: { id: 1, firstName: "A", lastName: "B", nationalId: null },
          player2: { id: 2, firstName: "C", lastName: "D", nationalId: null },
        },
      ] as any);

      const game = {
        gameId: "game-1",
        gameType: "PAIRS",
        scoringType: "MP",
      } as BridgeGame;

      const result = await computeLeaderboard(game);

      expect(result.type).toBe("PAIR_MP");
      expect(result.overallScore).toBeDefined();
      expect(result.overallScore.lines).toHaveLength(2);
      expect(result.participants).toHaveLength(1);
      expect(score).toHaveBeenCalledTimes(1);
      expect(calculateOverallMPResults).toHaveBeenCalledTimes(1);
    });

    it("skips boards with no confirmed or override results", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockResolvedValue([
            {
              boardNumber: 1,
              ns: "1",
              ew: "2",
              confirmedResult: null,
              directorOverrideResult: null,
            },
            {
              boardNumber: 2,
              ns: "1",
              ew: "2",
              confirmedResult: null,
              directorOverrideResult: null,
            },
          ]),
        }),
      };
      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);

      vi.mocked(calculateOverallMPResults).mockReturnValue({
        type: "PAIR_MP",
        mode: "PAIR",
        scoring: "MP",
        lines: [],
      } as any);

      vi.mocked(findPairs).mockResolvedValue([]);

      const game = {
        gameId: "game-1",
        gameType: "PAIRS",
        scoringType: "MP",
      } as BridgeGame;

      const result = await computeLeaderboard(game);

      expect(score).not.toHaveBeenCalled();
      expect(result.overallScore.lines).toHaveLength(0);
    });

    it("uses director override result when available", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockResolvedValue([
            {
              boardNumber: 1,
              ns: "1",
              ew: "2",
              confirmedResult: "3NTN=",
              directorOverrideResult: "3NTN+1",
            },
            {
              boardNumber: 1,
              ns: "3",
              ew: "4",
              confirmedResult: "2HE-1",
              directorOverrideResult: null,
            },
          ]),
        }),
      };
      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);

      vi.mocked(score).mockReturnValue({
        type: "PAIR_MP",
        board: 1,
        lines: [],
      } as any);

      vi.mocked(calculateOverallMPResults).mockReturnValue({
        type: "PAIR_MP",
        mode: "PAIR",
        scoring: "MP",
        lines: [{ pairId: "1", totalMP: 2, maxMP: 2 }],
      } as any);

      vi.mocked(findPairs).mockResolvedValue([]);

      const game = {
        gameId: "game-1",
        gameType: "PAIRS",
        scoringType: "MP",
      } as BridgeGame;

      await computeLeaderboard(game);

      // score should be called with the override result for pair 1
      expect(score).toHaveBeenCalledWith(
        expect.objectContaining({
          lines: expect.arrayContaining([
            expect.objectContaining({
              nsId: "1",
              ewId: "2",
              outcome: "3NTN+1",
            }),
            expect.objectContaining({ nsId: "3", ewId: "4", outcome: "2HE-1" }),
          ]),
        }),
        "MP",
      );
    });
  });

  describe("PAIRS + XIMP", () => {
    it("uses XIMP scoring mode for IMP-type games", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockResolvedValue([
            {
              boardNumber: 1,
              ns: "1",
              ew: "2",
              confirmedResult: "3NTN=",
              directorOverrideResult: null,
            },
          ]),
        }),
      };
      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);

      vi.mocked(score).mockReturnValue({
        type: "PAIR_XIMP",
        board: 1,
        lines: [],
      } as any);

      vi.mocked(calculatePairXIMPResults).mockReturnValue({
        type: "PAIR_XIMP",
        mode: "PAIR",
        scoring: "XIMP",
        lines: [],
      } as any);

      vi.mocked(findPairs).mockResolvedValue([]);

      const game = {
        gameId: "game-1",
        gameType: "PAIRS",
        scoringType: "IMP",
      } as BridgeGame;

      await computeLeaderboard(game);

      expect(score).toHaveBeenCalledWith(expect.anything(), "XIMP");
      expect(calculatePairXIMPResults).toHaveBeenCalled();
    });

    it("uses XIMP scoring mode for XIMP-type games (line 63, 72)", async () => {
      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockResolvedValue([
            {
              boardNumber: 1,
              ns: "1",
              ew: "2",
              confirmedResult: "4HS+1",
              directorOverrideResult: null,
            },
            {
              boardNumber: 1,
              ns: "3",
              ew: "4",
              confirmedResult: "3NTN=",
              directorOverrideResult: null,
            },
          ]),
        }),
      };
      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);

      vi.mocked(score).mockReturnValue({
        type: "PAIR_XIMP",
        board: 1,
        lines: [
          { nsId: "1", ewId: "2", nsXimps: 5, ewXimps: -5 },
          { nsId: "3", ewId: "4", nsXimps: -5, ewXimps: 5 },
        ],
      } as any);

      vi.mocked(calculatePairXIMPResults).mockReturnValue({
        type: "PAIR_XIMP",
        mode: "PAIR",
        scoring: "XIMP",
        lines: [
          { pairId: "1", totalXimps: 5 },
          { pairId: "3", totalXimps: -5 },
        ],
      } as any);

      vi.mocked(findPairs).mockResolvedValue([]);

      const game = {
        gameId: "game-1",
        gameType: "PAIRS",
        scoringType: "XIMP",
      } as BridgeGame;

      const result = await computeLeaderboard(game);

      expect(result.type).toBe("PAIR_XIMP");
      expect(score).toHaveBeenCalledWith(expect.anything(), "XIMP");
      expect(calculatePairXIMPResults).toHaveBeenCalledTimes(1);
      expect(calculateOverallMPResults).not.toHaveBeenCalled();
    });
  });
});
