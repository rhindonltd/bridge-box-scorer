import { describe, it, expect, vi, beforeEach } from "vitest";
import { computeLeaderboard } from "./leaderboard-service";
import { BridgeGame } from "@/db/game-index/schema";

vi.mock("@/db/games", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(),
}));

vi.mock("@/db/games/tables/boards", () => ({
  boards: "pairsBoards",
}));

vi.mock("@/db/games/queries/find-pairs", () => ({
  findPairs: vi.fn(),
}));

vi.mock("@/scoring/traveller/score-traveller", () => ({
  scoreBoard: vi.fn(),
}));

// The overall aggregation is resolved through the plugin registry; mock the
// registry so we can assert which plugin is selected without exercising the
// real aggregators.
vi.mock("@/scoring/plugins/registry", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/scoring/plugins/registry")>();
  return {
    ...actual,
    getCombination: vi.fn(),
    getOverallPlugin: vi.fn(),
  };
});

import { Db, getDb as getPairsDb } from "@/db/games";
import { findPairs } from "@/db/games/queries/find-pairs";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { scoreBoard } from "@/scoring/traveller/score-traveller";
import { getCombination, getOverallPlugin } from "@/scoring/plugins/registry";

/** Build a mock overall plugin whose aggregate returns the given overall score. */
function mockOverallPlugin(overallScore: unknown) {
  const aggregate = vi.fn().mockReturnValue(overallScore);
  vi.mocked(getOverallPlugin).mockReturnValue({
    id: "MP",
    aggregate,
    views: [],
  } as any);
  return aggregate;
}

describe("leaderboard-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: an MP pairs game. Individual describe blocks override as needed.
    vi.mocked(findGameById).mockResolvedValue({
      gameId: "game-1",
      gameType: "PAIRS",
      scoringType: "MP",
    } as BridgeGame);
    // Default combination maps MP -> { perBoard: MP, overall: MP }.
    vi.mocked(getCombination).mockReturnValue({
      perBoard: "MP",
      overall: "MP",
    });
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
      } as unknown as Db;
      vi.mocked(getPairsDb).mockResolvedValue(mockDb);

      vi.mocked(scoreBoard).mockReturnValue({
        pluginId: "MP",
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

      const aggregate = mockOverallPlugin({
        type: "PAIR_MP",
        mode: "PAIR",
        scoring: "MP",
        lines: [
          { pairId: "3", totalMP: 2, maxMP: 2 },
          { pairId: "1", totalMP: 0, maxMP: 2 },
        ],
      });

      vi.mocked(findPairs).mockResolvedValue([
        {
          initialSeat: "1NS",
          type: "PAIR",
          player1: { id: 1, firstName: "A", lastName: "B", nationalId: null },
          player2: { id: 2, firstName: "C", lastName: "D", nationalId: null },
        },
      ] as any);

      const result = await computeLeaderboard(mockDb, "game-1");

      expect(result.type).toBe("PAIR_MP");
      expect(result.overallScore).toBeDefined();
      expect(result.overallScore.lines).toHaveLength(2);
      expect(result.participants).toHaveLength(1);
      expect(scoreBoard).toHaveBeenCalledTimes(1);
      expect(getCombination).toHaveBeenCalledWith("MP");
      expect(getOverallPlugin).toHaveBeenCalledWith("MP");
      expect(aggregate).toHaveBeenCalledTimes(1);
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
      } as unknown as Db;
      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);

      mockOverallPlugin({
        type: "PAIR_MP",
        mode: "PAIR",
        scoring: "MP",
        lines: [],
      });

      vi.mocked(findPairs).mockResolvedValue([]);

      const result = await computeLeaderboard(mockDb, "game-1");

      expect(scoreBoard).not.toHaveBeenCalled();
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
      } as unknown as Db;
      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);

      vi.mocked(scoreBoard).mockReturnValue({
        pluginId: "MP",
        board: 1,
        lines: [],
      } as any);

      mockOverallPlugin({
        type: "PAIR_MP",
        mode: "PAIR",
        scoring: "MP",
        lines: [{ pairId: "1", totalMP: 2, maxMP: 2 }],
      });

      vi.mocked(findPairs).mockResolvedValue([]);

      await computeLeaderboard(mockDb, "game-1");

      // scoreBoard should be called with the override result for pair 1
      expect(scoreBoard).toHaveBeenCalledWith(
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
    beforeEach(() => {
      vi.mocked(findGameById).mockResolvedValue({
        gameId: "game-1",
        gameType: "PAIRS",
        scoringType: "XIMP",
      } as BridgeGame);
      vi.mocked(getCombination).mockReturnValue({
        perBoard: "XIMP",
        overall: "XIMP",
      });
    });

    it("selects the XIMP per-board plugin and overall combination", async () => {
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
      } as unknown as Db;
      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);

      vi.mocked(scoreBoard).mockReturnValue({
        pluginId: "XIMP",
        board: 1,
        lines: [],
      } as any);

      const aggregate = mockOverallPlugin({
        type: "PAIR_XIMP",
        mode: "PAIR",
        scoring: "XIMP",
        lines: [],
      });

      vi.mocked(findPairs).mockResolvedValue([]);

      await computeLeaderboard(mockDb, "game-1");

      expect(scoreBoard).toHaveBeenCalledWith(expect.anything(), "XIMP");
      expect(getCombination).toHaveBeenCalledWith("XIMP");
      expect(getOverallPlugin).toHaveBeenCalledWith("XIMP");
      expect(aggregate).toHaveBeenCalledTimes(1);
    });

    it("returns the XIMP overall score type", async () => {
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
      } as unknown as Db;
      vi.mocked(getPairsDb).mockResolvedValue(mockDb as any);

      vi.mocked(scoreBoard).mockReturnValue({
        pluginId: "XIMP",
        board: 1,
        lines: [
          { nsId: "1", ewId: "2", nsCrossImps: 5, ewCrossImps: -5 },
          { nsId: "3", ewId: "4", nsCrossImps: -5, ewCrossImps: 5 },
        ],
      } as any);

      mockOverallPlugin({
        type: "PAIR_XIMP",
        mode: "PAIR",
        scoring: "XIMP",
        lines: [
          { pairId: "1", crossImps: 5 },
          { pairId: "3", crossImps: -5 },
        ],
      });

      vi.mocked(findPairs).mockResolvedValue([]);

      const result = await computeLeaderboard(mockDb, "game-1");

      expect(result.type).toBe("PAIR_XIMP");
      expect(scoreBoard).toHaveBeenCalledWith(expect.anything(), "XIMP");
    });
  });
});
