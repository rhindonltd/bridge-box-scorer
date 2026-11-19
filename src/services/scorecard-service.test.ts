// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

const m = vi.hoisted(() => ({
  findGameById: vi.fn(),
  getSchedule: vi.fn(),
  findSections: vi.fn(),
  getBoardInstances: vi.fn(),
  scoreBoard: vi.fn(),
  getCombination: vi.fn(),
  buildLeaderboards: vi.fn(),
}));

vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: m.findGameById,
}));
vi.mock("@/db/games/queries/find-sections", () => ({
  findSections: m.findSections,
}));
vi.mock("@/services/board-service", () => ({
  getBoardInstances: m.getBoardInstances,
}));
vi.mock("@/services/schedule-service", () => ({
  getSchedule: m.getSchedule,
}));
vi.mock("@/services/leaderboard-service", () => ({
  buildLeaderboards: m.buildLeaderboards,
}));
vi.mock("@/scoring/traveller/score-traveller", () => ({
  scoreBoard: m.scoreBoard,
}));
vi.mock("@/scoring/plugins/registry", () => ({
  getCombination: m.getCombination,
}));

import { buildPairScorecard } from "./scorecard-service";

const db = {} as never;

function instance(
  ns: string,
  ew: string,
  roundNumber = 1,
  currentResult: string | null = "3NTN=",
) {
  return { roundNumber, participants: { ns, ew }, currentResult };
}

function game(overrides: Record<string, unknown> = {}) {
  return {
    gameType: "PAIRS",
    scoringType: "MP",
    eventFormat: "STANDARD",
    combinedRanking: true,
    ...overrides,
  };
}

function schedule(
  rounds: { roundNumber: number; boards: number[]; sitOut?: boolean }[],
) {
  return { assignmentId: "A1NS", rounds };
}

beforeEach(() => {
  vi.resetAllMocks();
  m.findGameById.mockResolvedValue(game());
  m.findSections.mockResolvedValue([{ section: "A" }]);
  m.getCombination.mockImplementation(() => ({ perBoard: "MP" }));
  m.getSchedule.mockResolvedValue(schedule([{ roundNumber: 1, boards: [1] }]));
  m.getBoardInstances.mockResolvedValue([instance("A1NS", "A1EW")]);
  m.scoreBoard.mockReturnValue({
    lines: [
      {
        nsId: "A1NS",
        ewId: "A1EW",
        score: 400,
        nsMatchPoints: 1,
        ewMatchPoints: 0,
        maxMatchPoints: 1,
      },
    ],
  });
});

describe("buildPairScorecard (mocked collaborators)", () => {
  it("returns null when the game does not exist", async () => {
    m.findGameById.mockResolvedValue(null);
    expect(await buildPairScorecard(db, "g", "A1NS")).toBeNull();
  });

  it("skips sit-out rounds", async () => {
    m.getSchedule.mockResolvedValue(
      schedule([
        { roundNumber: 1, boards: [], sitOut: true },
        { roundNumber: 2, boards: [1] },
      ]),
    );
    m.getBoardInstances.mockResolvedValue([instance("A1NS", "A1EW", 2)]);
    const card = await buildPairScorecard(db, "g", "A1NS");
    expect(m.getBoardInstances).toHaveBeenCalledTimes(1);
    expect(card!.boards.map((b) => b.roundNumber)).toEqual([2]);
  });

  it("skips a board when the scored traveller has no line for the pair", async () => {
    m.scoreBoard.mockReturnValue({ lines: [] });
    const card = await buildPairScorecard(db, "g", "A1NS");
    expect(card!.boards).toEqual([]);
  });

  it("keeps a null score and defaults missing matchpoints to 0", async () => {
    m.scoreBoard.mockReturnValue({
      lines: [{ nsId: "A1NS", ewId: "A1EW", score: null }],
    });
    const card = await buildPairScorecard(db, "g", "A1NS");
    expect(card!.boards[0].score).toBeNull();
    expect(card!.boards[0].matchpoints).toEqual({ value: 0, max: 0 });
  });

  it("normalises a zero score for EW to 0 rather than -0 and uses EW matchpoints", async () => {
    m.getSchedule.mockResolvedValue({
      assignmentId: "A1EW",
      rounds: [{ roundNumber: 1, boards: [1] }],
    });
    m.scoreBoard.mockReturnValue({
      lines: [
        {
          nsId: "A1NS",
          ewId: "A1EW",
          score: 0,
          nsMatchPoints: 0,
          ewMatchPoints: 3,
          maxMatchPoints: 4,
        },
      ],
    });
    const card = await buildPairScorecard(db, "g", "A1EW");
    expect(Object.is(card!.boards[0].score, 0)).toBe(true);
    expect(card!.boards[0].side).toBe("EW");
    expect(card!.boards[0].matchpoints).toEqual({ value: 3, max: 4 });
  });

  it("carries IMPs for NS and EW, defaulting to 0", async () => {
    m.getCombination.mockReturnValue({ perBoard: "IMP" });
    m.scoreBoard.mockReturnValue({
      lines: [{ nsId: "A1NS", ewId: "A1EW", score: 10, nsImps: 5, ewImps: -5 }],
    });
    const ns = await buildPairScorecard(db, "g", "A1NS");
    expect(ns!.boards[0].imps).toBe(5);

    m.getSchedule.mockResolvedValue({
      assignmentId: "A1EW",
      rounds: [{ roundNumber: 1, boards: [1] }],
    });
    const ew = await buildPairScorecard(db, "g", "A1EW");
    expect(ew!.boards[0].imps).toBe(-5);

    m.scoreBoard.mockReturnValue({
      lines: [{ nsId: "A1NS", ewId: "A1EW", score: 10 }],
    });
    const none = await buildPairScorecard(db, "g", "A1EW");
    expect(none!.boards[0].imps).toBe(0);
  });

  it("carries cross-IMPs for NS and EW, defaulting to 0", async () => {
    m.getCombination.mockReturnValue({ perBoard: "XIMP" });
    m.scoreBoard.mockReturnValue({
      lines: [
        {
          nsId: "A1NS",
          ewId: "A1EW",
          score: 10,
          nsCrossImps: 2,
          ewCrossImps: -2,
        },
      ],
    });
    const ns = await buildPairScorecard(db, "g", "A1NS");
    expect(ns!.boards[0].crossImps).toBe(2);

    m.getSchedule.mockResolvedValue({
      assignmentId: "A1EW",
      rounds: [{ roundNumber: 1, boards: [1] }],
    });
    const ew = await buildPairScorecard(db, "g", "A1EW");
    expect(ew!.boards[0].crossImps).toBe(-2);

    m.scoreBoard.mockReturnValue({
      lines: [{ nsId: "A1NS", ewId: "A1EW", score: 10 }],
    });
    const none = await buildPairScorecard(db, "g", "A1EW");
    expect(none!.boards[0].crossImps).toBe(0);
  });

  it("drops traveller lines without a result before scoring", async () => {
    m.getBoardInstances.mockResolvedValue([
      instance("A1NS", "A1EW"),
      instance("A2NS", "A2EW", 1, null),
    ]);
    await buildPairScorecard(db, "g", "A1NS");
    const traveller = m.scoreBoard.mock.calls[0][0];
    expect(traveller.lines).toHaveLength(1);
  });

  describe("Swiss round VPs", () => {
    const swissLine = {
      pairId: "A1NS",
      vpByRound: { 2: 9.5, 1: 12 },
    };
    const swissBoard = (lines: unknown[]) => ({
      overallScore: { type: "PAIR_SWISS_VP", lines },
    });

    beforeEach(() => {
      m.findGameById.mockResolvedValue(game({ eventFormat: "SWISS" }));
    });

    it("reads the combined leaderboard, sorted by round, with opponents", async () => {
      m.buildLeaderboards.mockResolvedValue({
        leaderboard: swissBoard([{ other: 1 }, swissLine]),
        sections: [],
      });
      const card = await buildPairScorecard(db, "g", "A1NS");
      expect(card!.roundVps).toEqual([
        { roundNumber: 1, opponentId: "A1EW", vp: 12 },
        { roundNumber: 2, opponentId: null, vp: 9.5 },
      ]);
    });

    it("reads the pair's own section when sections are ranked separately", async () => {
      m.findGameById.mockResolvedValue(
        game({ eventFormat: "SWISS", combinedRanking: false }),
      );
      m.findSections.mockResolvedValue([{ section: "A" }, { section: "B" }]);
      m.buildLeaderboards.mockResolvedValue({
        leaderboard: swissBoard([]),
        sections: [
          { section: "B", ...swissBoard([]) },
          { section: "A", ...swissBoard([swissLine]) },
        ],
      });
      const card = await buildPairScorecard(db, "g", "A1NS");
      expect(card!.roundVps).toHaveLength(2);
    });

    it("falls back to the section board when there is no combined leaderboard", async () => {
      m.buildLeaderboards.mockResolvedValue({
        leaderboard: null,
        sections: [{ section: "A", ...swissBoard([swissLine]) }],
      });
      const card = await buildPairScorecard(db, "g", "A1NS");
      expect(card!.roundVps).toHaveLength(2);
    });

    it("is empty when there is no leaderboard at all", async () => {
      m.buildLeaderboards.mockResolvedValue({
        leaderboard: null,
        sections: [],
      });
      const card = await buildPairScorecard(db, "g", "A1NS");
      expect(card!.roundVps).toEqual([]);
    });

    it("is empty when the leaderboard is not a Swiss VP table", async () => {
      m.buildLeaderboards.mockResolvedValue({
        leaderboard: { overallScore: { type: "PAIR_MP", lines: [] } },
        sections: [],
      });
      const card = await buildPairScorecard(db, "g", "A1NS");
      expect(card!.roundVps).toEqual([]);
    });

    it("is empty when the pair has no line, or its line has no VPs", async () => {
      m.buildLeaderboards.mockResolvedValue({
        leaderboard: swissBoard([{ pairId: "other", vpByRound: {} }]),
        sections: [],
      });
      expect((await buildPairScorecard(db, "g", "A1NS"))!.roundVps).toEqual([]);

      m.buildLeaderboards.mockResolvedValue({
        leaderboard: swissBoard([{ pairId: "A1NS" }]),
        sections: [],
      });
      expect((await buildPairScorecard(db, "g", "A1NS"))!.roundVps).toEqual([]);
    });
  });
});
