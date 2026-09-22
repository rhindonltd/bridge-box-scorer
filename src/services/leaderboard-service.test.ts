import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  computeLeaderboard,
  computeSectionLeaderboards,
} from "./leaderboard-service";
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

// Teams are only read for teams-VP games; mock the query so those paths don't
// touch a real db.
vi.mock("@/db/games/queries/find-teams", () => ({
  findTeams: vi.fn(),
}));

// The Swiss/Teams VP overall calculators are exercised elsewhere; here we mock
// them to assert routing and return canned overalls.
vi.mock("@/scoring/swiss/swiss-vp-overall", () => ({
  calculateSwissVpOverall: vi.fn(),
}));
vi.mock("@/scoring/swiss/swiss-mp-vp-overall", () => ({
  calculateSwissMpVpOverall: vi.fn(),
}));
vi.mock("@/scoring/swiss/teams-vp-overall", () => ({
  calculateTeamsVpOverall: vi.fn(),
}));

import { Db, getDb as getPairsDb } from "@/db/games";
import { findPairs } from "@/db/games/queries/find-pairs";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { findTeams } from "@/db/games/queries/find-teams";
import { scoreBoard } from "@/scoring/traveller/score-traveller";
import { getCombination, getOverallPlugin } from "@/scoring/plugins/registry";
import { calculateSwissVpOverall } from "@/scoring/swiss/swiss-vp-overall";
import { calculateSwissMpVpOverall } from "@/scoring/swiss/swiss-mp-vp-overall";
import { calculateTeamsVpOverall } from "@/scoring/swiss/teams-vp-overall";

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

describe("computeSectionLeaderboards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findGameById).mockResolvedValue({
      gameId: "game-1",
      gameType: "PAIRS",
      scoringType: "MP",
    } as BridgeGame);
    vi.mocked(getCombination).mockReturnValue({
      perBoard: "MP",
      overall: "MP",
    });
  });

  it("computes one leaderboard per section, sorted ascending", async () => {
    // Section B rows come first to prove the ascending sort of the result.
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockResolvedValue([
          {
            boardNumber: 1,
            ns: "1",
            ew: "2",
            section: "B",
            confirmedResult: "3NTN=",
            directorOverrideResult: null,
          },
          {
            boardNumber: 1,
            ns: "1",
            ew: "2",
            section: "A",
            confirmedResult: "3NTN+1",
            directorOverrideResult: null,
          },
        ]),
      }),
    } as unknown as Db;

    vi.mocked(scoreBoard).mockReturnValue({
      pluginId: "MP",
      board: 1,
      lines: [],
    } as any);

    mockOverallPlugin({
      type: "PAIR_MP",
      mode: "PAIR",
      scoring: "MP",
      lines: [],
    });

    // Two pairs, one in each section, to exercise pairsBySection grouping.
    vi.mocked(findPairs).mockResolvedValue([
      {
        initialSeat: "A1NS",
        type: "PAIR",
        player1: { id: 1, firstName: "A", lastName: "B", nationalId: null },
        player2: { id: 2, firstName: "C", lastName: "D", nationalId: null },
      },
      {
        initialSeat: "B1NS",
        type: "PAIR",
        player1: { id: 3, firstName: "E", lastName: "F", nationalId: null },
        player2: { id: 4, firstName: "G", lastName: "H", nationalId: null },
      },
    ] as any);

    const result = await computeSectionLeaderboards(mockDb, "game-1");

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.section)).toEqual(["A", "B"]);
    expect(result[0].type).toBe("PAIR_MP");
    expect(result[0].participants).toHaveLength(1);
    expect(result[0].participants[0].id).toBe("A1NS");
    expect(result[1].participants[0].id).toBe("B1NS");
    // One scoreBoard call per section (each has one board with a result).
    expect(scoreBoard).toHaveBeenCalledTimes(2);
  });

  it("falls back to empty rows/pairs for a section present only on one side", async () => {
    // A section with board rows but no pairs, and a section with pairs but no
    // rows — exercises both `?? []` fallbacks in the section map lookups.
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockResolvedValue([
          {
            boardNumber: 1,
            ns: "1",
            ew: "2",
            section: "A",
            confirmedResult: "3NTN=",
            directorOverrideResult: null,
          },
        ]),
      }),
    } as unknown as Db;

    vi.mocked(scoreBoard).mockReturnValue({
      pluginId: "MP",
      board: 1,
      lines: [],
    } as any);

    mockOverallPlugin({
      type: "PAIR_MP",
      mode: "PAIR",
      scoring: "MP",
      lines: [],
    });

    // Pair only in section B, which has no board rows.
    vi.mocked(findPairs).mockResolvedValue([
      {
        initialSeat: "B1NS",
        type: "PAIR",
        player1: { id: 3, firstName: "E", lastName: "F", nationalId: null },
        player2: { id: 4, firstName: "G", lastName: "H", nationalId: null },
      },
    ] as any);

    const result = await computeSectionLeaderboards(mockDb, "game-1");

    expect(result.map((r) => r.section)).toEqual(["A", "B"]);
    // Section A has rows but no pairs.
    expect(result[0].section).toBe("A");
    expect(result[0].participants).toHaveLength(0);
    // Section B has a pair but no board rows -> scoreBoardsToOverall gets [].
    expect(result[1].section).toBe("B");
    expect(result[1].participants).toHaveLength(1);
  });
});

/** A db whose `select().from()` resolves to the given board rows. */
function dbWithBoards(rows: unknown[]): Db {
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockResolvedValue(rows),
    }),
  } as unknown as Db;
}

describe("Swiss Pairs VP routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // A Swiss Pairs game: selectedMovement encodes a SWISS spec so classifyEvent
    // returns SWISS_PAIRS_VP; scoringType decides the VP mode.
    vi.mocked(findGameById).mockResolvedValue({
      gameId: "game-1",
      gameType: "PAIRS",
      scoringType: "IMP",
      selectedMovement: JSON.stringify({
        source: "SWISS",
        swiss: { tables: 2, rounds: 4, boardsPerRound: 2 },
      }),
    } as BridgeGame);
    vi.mocked(findPairs).mockResolvedValue([]);
  });

  it("uses the Swiss IMP-VP overall for a Swiss + IMP game", async () => {
    vi.mocked(calculateSwissVpOverall).mockReturnValue({
      type: "SWISS_VP",
      lines: [],
    } as any);

    const result = await computeLeaderboard(dbWithBoards([]), "game-1");

    expect(calculateSwissVpOverall).toHaveBeenCalledTimes(1);
    expect(calculateSwissMpVpOverall).not.toHaveBeenCalled();
    expect(result.type).toBe("SWISS_VP");
  });

  it("uses the Swiss MP-VP overall for a Swiss + MP game", async () => {
    vi.mocked(findGameById).mockResolvedValue({
      gameId: "game-1",
      gameType: "PAIRS",
      scoringType: "MP",
      selectedMovement: JSON.stringify({
        source: "SWISS",
        swiss: { tables: 2, rounds: 4, boardsPerRound: 2 },
      }),
    } as BridgeGame);
    vi.mocked(calculateSwissMpVpOverall).mockReturnValue({
      type: "SWISS_MP_VP",
      lines: [],
    } as any);

    const result = await computeLeaderboard(dbWithBoards([]), "game-1");

    expect(calculateSwissMpVpOverall).toHaveBeenCalledTimes(1);
    expect(result.type).toBe("SWISS_MP_VP");
  });
});

describe("Teams VP routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findGameById).mockResolvedValue({
      gameId: "game-1",
      gameType: "TEAMS",
      scoringType: "IMP",
      selectedMovement: JSON.stringify({
        source: "SWISS_TEAMS",
        swissTeams: { teams: 4, rounds: 4, boardsPerRound: 3 },
      }),
    } as BridgeGame);
    vi.mocked(findPairs).mockResolvedValue([]);
  });

  it("ranks teams on VP for a teams-VP game (combined and per-section)", async () => {
    vi.mocked(findTeams).mockResolvedValue([
      { id: "A1NS", type: "TEAM" } as any,
    ]);
    vi.mocked(calculateTeamsVpOverall).mockReturnValue({
      type: "TEAMS_VP",
      lines: [],
    } as any);

    const combined = await computeLeaderboard(
      dbWithBoards([{ boardNumber: 1, ns: "A1NS", ew: "A2EW", section: "A" }]),
      "game-1",
    );
    expect(combined.type).toBe("TEAMS_VP");
    expect(combined.participants).toHaveLength(1);

    const sections = await computeSectionLeaderboards(
      dbWithBoards([
        { boardNumber: 1, ns: "A1NS", ew: "A2EW", section: "A" },
        // Section B has board rows but no team -> exercises the `?? []`
        // fallback for teamsBySection in the per-section teams-VP path.
        { boardNumber: 1, ns: "B1NS", ew: "B2EW", section: "B" },
      ]),
      "game-1",
    );
    expect(sections.map((s) => s.section)).toEqual(["A", "B"]);
    expect(sections[0].type).toBe("TEAMS_VP");
    expect(sections[0].participants).toHaveLength(1);
    expect(sections[1].participants).toHaveLength(0);
    // findTeams is consulted for a teams-VP game.
    expect(findTeams).toHaveBeenCalled();
  });
});

describe("Swiss sit-out synthetic scoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findPairs).mockResolvedValue([]);
    // A non-Swiss-VP MP game so scoreBoardsToOverall (and its sit-out helper)
    // runs. (swissVpMode null -> falls through to the board-pooled overall.)
    vi.mocked(findGameById).mockResolvedValue({
      gameId: "game-1",
      gameType: "PAIRS",
      scoringType: "MP",
    } as BridgeGame);
  });

  it("credits a bye pair 60% of the board top under matchpoints", async () => {
    vi.mocked(getCombination).mockReturnValue({
      perBoard: "MP",
      overall: "MP",
    });
    // A real played board (board 1) gives a maxMatchPoints top of 2; a SIT_OUT
    // row on the same board credits the bye pair 60% of that top.
    vi.mocked(scoreBoard).mockReturnValue({
      pluginId: "MP",
      board: 1,
      lines: [
        {
          nsId: "1",
          ewId: "2",
          nsMatchPoints: 2,
          ewMatchPoints: 0,
          maxMatchPoints: 2,
        },
      ],
    } as any);
    const aggregate = mockOverallPlugin({ type: "PAIR_MP", lines: [] });

    await computeLeaderboard(
      dbWithBoards([
        {
          boardNumber: 1,
          ns: "1",
          ew: "2",
          section: "A",
          status: "CONFIRMED",
          confirmedResult: "3NTN=",
          directorOverrideResult: null,
        },
        {
          boardNumber: 1,
          ns: "5",
          ew: "PHANTOM",
          section: "A",
          status: "SIT_OUT",
          confirmedResult: null,
          directorOverrideResult: null,
        },
      ]),
      "game-1",
    );

    // The aggregator receives the real board line plus one synthetic sit-out
    // line crediting pair 5 with 0.6 * 2 = 1.2 matchpoints.
    const passed = aggregate.mock.calls[0][0] as { lines: any[] }[];
    const allLines = passed.flatMap((b) => b.lines);
    expect(
      allLines.some((l) => l.nsId === "5" && l.nsMatchPoints === 1.2),
    ).toBe(true);
  });

  it("skips the bye credit when no sibling board has been scored yet", async () => {
    vi.mocked(getCombination).mockReturnValue({
      perBoard: "MP",
      overall: "MP",
    });
    // No played board on board 7 -> top unknown -> the bye is credited nothing.
    const aggregate = mockOverallPlugin({ type: "PAIR_MP", lines: [] });

    await computeLeaderboard(
      dbWithBoards([
        {
          boardNumber: 7,
          ns: "5",
          ew: "PHANTOM",
          section: "A",
          status: "SIT_OUT",
          confirmedResult: null,
          directorOverrideResult: null,
        },
      ]),
      "game-1",
    );

    const passed = aggregate.mock.calls[0][0] as { lines: any[] }[];
    expect(passed.flatMap((b) => b.lines)).toHaveLength(0);
    expect(scoreBoard).not.toHaveBeenCalled();
  });

  it("credits a bye pair zero net imps under IMP scoring", async () => {
    vi.mocked(getCombination).mockReturnValue({
      perBoard: "IMP",
      overall: "IMP",
    });
    const aggregate = mockOverallPlugin({ type: "PAIR_IMP", lines: [] });

    await computeLeaderboard(
      dbWithBoards([
        {
          boardNumber: 1,
          ns: "5",
          ew: "PHANTOM",
          section: "A",
          status: "SIT_OUT",
          confirmedResult: null,
          directorOverrideResult: null,
        },
      ]),
      "game-1",
    );

    const allLines = (aggregate.mock.calls[0][0] as { lines: any[] }[]).flatMap(
      (b) => b.lines,
    );
    expect(
      allLines.some((l) => l.nsId === "5" && l.nsImps === 0 && l.ewImps === 0),
    ).toBe(true);
  });

  it("credits a bye pair zero cross-imps under Cross-IMP scoring", async () => {
    vi.mocked(getCombination).mockReturnValue({
      perBoard: "XIMP",
      overall: "XIMP",
    });
    const aggregate = mockOverallPlugin({ type: "PAIR_XIMP", lines: [] });

    await computeLeaderboard(
      dbWithBoards([
        {
          boardNumber: 1,
          ns: "5",
          ew: "PHANTOM",
          section: "A",
          status: "SIT_OUT",
          confirmedResult: null,
          directorOverrideResult: null,
        },
      ]),
      "game-1",
    );

    const allLines = (aggregate.mock.calls[0][0] as { lines: any[] }[]).flatMap(
      (b) => b.lines,
    );
    expect(
      allLines.some(
        (l) => l.nsId === "5" && l.nsCrossImps === 0 && l.ewCrossImps === 0,
      ),
    ).toBe(true);
  });
});

describe("buildLeaderboards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findGameById).mockResolvedValue({
      gameId: "game-1",
      gameType: "PAIRS",
      scoringType: "MP",
    } as BridgeGame);
    vi.mocked(getCombination).mockReturnValue({
      perBoard: "MP",
      overall: "MP",
    });
    vi.mocked(findPairs).mockResolvedValue([]);
  });

  it("computes both the combined and per-section leaderboards from a single read", async () => {
    const { buildLeaderboards } = await import("./leaderboard-service");
    mockOverallPlugin({ type: "PAIR_MP", lines: [] });
    vi.mocked(scoreBoard).mockReturnValue({
      pluginId: "MP",
      board: 1,
      lines: [],
    } as any);

    const db = dbWithBoards([
      {
        boardNumber: 1,
        ns: "1",
        ew: "2",
        section: "A",
        status: "CONFIRMED",
        confirmedResult: "3NTN=",
        directorOverrideResult: null,
      },
    ]);

    const { leaderboard, sections } = await buildLeaderboards(db, "game-1");

    expect(leaderboard.type).toBe("PAIR_MP");
    expect(sections).toHaveLength(1);
    expect(sections[0].section).toBe("A");
  });
});
