import { describe, expect, it } from "vitest";

import {
  buildUsebioData,
  type UsebioField,
  type UsebioSnapshot,
} from "./assemble-usebio";
import type {
  UsebioBoardComparisonTeamsData,
  UsebioPairsData,
  UsebioSwissPairsData,
  UsebioSwissTeamsData,
} from "./generate-usebio";
import type {
  PairsMatchResult,
  RoomResult,
  ScoredLine,
  TeamMatchResult,
} from "@/model/event-detail";
import type { OverallScore } from "@/model/leaderboard";
import type { AssignedTeam } from "@/model/participants";
import type { BoardOutcome } from "@/model/score";

const player = (name: string) => ({
  firstName: name,
  lastName: "Player",
  nationalId: null,
});

function room(overrides: Partial<RoomResult>): RoomResult {
  return {
    section: "A",
    roundNumber: 1,
    tableNumber: 1,
    boardNumber: 1,
    ns: "A1NS",
    ew: "A1EW",
    outcome: "3NTN=" as BoardOutcome,
    lead: null,
    nsScore: 400,
    seatsSwapped: false,
    ...overrides,
  };
}

function line(overrides: Partial<ScoredLine>): ScoredLine {
  return {
    ...room({}),
    field: "A",
    outcome: "3NTN=" as BoardOutcome,
    nsValue: 1,
    ewValue: 1,
    top: 2,
    ...overrides,
  };
}

function snapshot(overrides: Partial<UsebioSnapshot>): UsebioSnapshot {
  return {
    format: "PAIRS_BOARD",
    scoringType: "MP",
    club: { name: "Club", clubNumber: "1" },
    eventName: "Event",
    eventDate: "2026-11-16",
    sectionName: "A",
    fields: [],
    pairs: [],
    teams: [],
    occupancies: [],
    lines: [],
    pairsMatches: [],
    teamMatches: [],
    ...overrides,
  };
}

const mpStandings = (
  lines: { pairId: string; totalMP: number; maxMP: number; rank: number }[],
): OverallScore => ({
  type: "PAIR_MP",
  mode: "PAIR",
  scoring: "MP",
  lines: lines.map((l) => ({ ...l, tied: false })),
});

function field(overrides: Partial<UsebioField>): UsebioField {
  return {
    field: "A",
    sectionId: "A",
    qualified: false,
    standings: mpStandings([]),
    ...overrides,
  };
}

describe("buildUsebioData — board-pooled pairs", () => {
  const pairs = [
    { id: "A1NS", seat: "A1NS", player1: player("a"), player2: player("b") },
    { id: "A1EW", seat: "A1EW", player1: player("c"), player2: player("d") },
    { id: "A2NS", seat: "A2NS", player1: player("e"), player2: player("f") },
    // Seated, but played no board: left out of the file (E6).
    { id: "A2EW", seat: "A2EW", player1: player("g"), player2: player("h") },
  ];
  const lines = [
    line({ boardNumber: 2, ns: "A1NS", ew: "A1EW", nsValue: 0, ewValue: 2 }),
    line({
      boardNumber: 1,
      tableNumber: 2,
      ns: "A2NS",
      ew: "A1EW",
      nsValue: 0,
      ewValue: 2,
      lead: "HK",
      nsScore: 420,
    }),
    line({ boardNumber: 1, ns: "A1NS", ew: "A1EW", nsValue: 2, ewValue: 0 }),
  ];

  it("writes the scored lines, the pairs that played and their placings", () => {
    const data = buildUsebioData(
      snapshot({
        pairs,
        lines,
        fields: [
          field({
            standings: mpStandings([
              { pairId: "A1EW", totalMP: 4, maxMP: 6, rank: 1 },
              { pairId: "A1NS", totalMP: 2, maxMP: 4, rank: 2 },
              // No comparable board yet: written at 50%, as on the leaderboard.
              { pairId: "A2NS", totalMP: 0, maxMP: 0, rank: 3 },
            ]),
          }),
        ],
      }),
    ) as UsebioPairsData;

    expect(data.kind).toBe("MP_PAIRS");
    expect(data.sections).toEqual(["A"]);
    expect(data.winnerType).toBe(1);
    expect(data.boards).toBe(2);
    // Section-local numbers; the pair with no board is not listed.
    expect(data.pairs.map((p) => [p.pairNumber, p.direction])).toEqual([
      ["1NS", "N"],
      ["1EW", "E"],
      ["2NS", "N"],
    ]);
    // Lines in board, round, table order, with their adjusted figures (E2).
    expect(data.boardResults.map((r) => [r.board, r.table])).toEqual([
      [1, 1],
      [1, 2],
      [2, 1],
    ]);
    expect(data.boardResults[1]).toMatchObject({
      nsPairNumber: "2NS",
      ewPairNumber: "1EW",
      lead: "HK",
      score: 420,
      lineScore: { ns: 0, ew: 2 },
      section: "A",
    });
    expect(data.placings).toEqual([
      { section: "A", pairNumber: "1EW", percentage: "66.67", place: 1 },
      { section: "A", pairNumber: "1NS", percentage: "50.00", place: 2 },
      { section: "A", pairNumber: "2NS", percentage: "50.00", place: 3 },
    ]);
  });

  it("names the default section A when the event has none", () => {
    const data = buildUsebioData(snapshot({ sectionName: "" }));
    expect(data.sectionName).toBe("A");
  });

  it("writes a pooled field with section-qualified pair numbers (E4)", () => {
    const data = buildUsebioData(
      snapshot({
        pairs,
        lines: lines.map((l) => ({ ...l, field: "game-1" })),
        fields: [
          field({
            field: "game-1",
            qualified: true,
            standings: mpStandings([
              { pairId: "A1NS", totalMP: 2, maxMP: 4, rank: 1 },
            ]),
          }),
        ],
      }),
    ) as UsebioPairsData;

    expect(data.pairs[0].pairNumber).toBe("A1NS");
    expect(data.boardResults[0].nsPairNumber).toBe("A1NS");
    expect(data.placings[0].pairNumber).toBe("A1NS");
  });

  it("places a two-winner event within each direction (E5)", () => {
    const data = buildUsebioData(
      snapshot({
        pairs,
        lines,
        fields: [
          field({
            directional: {
              ns: mpStandings([
                { pairId: "A1NS", totalMP: 2, maxMP: 4, rank: 1 },
              ]),
              ew: mpStandings([
                { pairId: "A1EW", totalMP: 4, maxMP: 6, rank: 1 },
              ]),
            },
          }),
        ],
      }),
    ) as UsebioPairsData;

    expect(data.winnerType).toBe(2);
    expect(data.placings.map((p) => [p.pairNumber, p.place])).toEqual([
      ["1NS", 1],
      ["1EW", 1],
    ]);
  });

  it("places a Cross-IMP field on its average cross-IMPs (E1)", () => {
    const data = buildUsebioData(
      snapshot({
        scoringType: "XIMP",
        pairs,
        lines,
        fields: [
          field({
            standings: {
              type: "PAIR_XIMP",
              mode: "PAIR",
              scoring: "XIMP",
              lines: [
                { pairId: "A1NS", crossImps: 1.5, rank: 1, tied: false },
                { pairId: "A1EW", crossImps: -0.25, rank: 2, tied: false },
              ],
            },
          }),
        ],
      }),
    ) as UsebioPairsData;

    expect(data.placings).toEqual([
      { section: "A", pairNumber: "1NS", averageScore: "1.50", place: 1 },
      { section: "A", pairNumber: "1EW", averageScore: "-0.25", place: 2 },
    ]);
  });
});

describe("buildUsebioData — Swiss Pairs", () => {
  const swissStandings: OverallScore = {
    type: "PAIR_SWISS_VP",
    mode: "PAIR",
    scoring: "SWISS_VP",
    lines: [
      { pairId: "A1", totalVP: 15, vpByRound: { 1: 15 }, rank: 1, tied: false },
      { pairId: "A2", totalVP: 5, vpByRound: { 1: 5 }, rank: 2, tied: false },
    ],
  };
  const match: PairsMatchResult = {
    field: "A",
    section: "A",
    round: 1,
    ns: "A1",
    ew: "A2#7",
    nsVp: 15,
    ewVp: 5,
    boards: [
      room({ boardNumber: 3, ns: "A1", ew: "A2#7", nsScore: 450 }),
      room({ boardNumber: 4, outcome: null, nsScore: null }),
    ],
  };

  it("writes each match's Victory Points and traveller lines, and the ranking", () => {
    const data = buildUsebioData(
      snapshot({
        format: "SWISS_PAIRS_VP",
        pairs: [
          {
            id: "A1",
            seat: "A1NS",
            player1: player("a"),
            player2: player("b"),
          },
          {
            id: "A2",
            seat: "A1EW",
            player1: player("c"),
            player2: player("d"),
          },
          // A handover stand-in: listed (its match counts) but not ranked (E7).
          {
            id: "A2#7",
            seat: "A1EW",
            player1: player("e"),
            player2: player("f"),
          },
          // No result at all: left out (E6).
          {
            id: "A3",
            seat: "A2NS",
            player1: player("g"),
            player2: player("h"),
          },
        ],
        pairsMatches: [match, { ...match, field: "other" }],
        fields: [field({ standings: swissStandings })],
      }),
    ) as UsebioSwissPairsData;

    expect(data.kind).toBe("SWISS_PAIRS");
    expect(data.boards).toBe(2);
    expect(data.pairs.map((p) => p.pairNumber)).toEqual(["A1", "A2", "A2#7"]);
    expect(data.matches).toHaveLength(1);
    expect(data.matches[0]).toMatchObject({
      section: "A",
      round: 1,
      nsPairNumber: "A1",
      ewPairNumber: "A2#7",
      nsScore: 15,
      ewScore: 5,
    });
    expect(data.matches[0].boards[0]).toMatchObject({
      boardNumber: 3,
      contract: "3NT",
      score: "450",
    });
    // A board with no result yet is written as not played.
    expect(data.matches[0].boards[1]).toMatchObject({
      contract: "",
      score: "0",
    });
    expect(data.ranking).toEqual([
      { number: "A1", sectionId: "A", totalVP: 15, place: 1 },
      { number: "A2", sectionId: "A", totalVP: 5, place: 2 },
    ]);
  });
});

describe("buildUsebioData — teams", () => {
  /** A team at table `t`: its NS pair at home, its EW pair travelling. */
  const team = (t: number, name: string) => ({
    id: `A${t}NS`,
    name,
    pair1: {
      initialSeat: `A${t}NS`,
      player1: player("n"),
      player2: player("s"),
    },
    pair2: {
      initialSeat: `A${t}EW`,
      player1: player("e"),
      player2: player("w"),
    },
  });
  const teams = [
    team(1, "Team One"),
    team(2, "Team Two"),
    // In the roster but played nothing: left out of the file (E6).
    team(3, "Team Three"),
  ] as unknown as AssignedTeam[];

  const match: TeamMatchResult = {
    field: "A",
    section: "A",
    round: 1,
    triple: null,
    home: "A1NS",
    opponent: "A2NS",
    boards: [
      {
        boardNumber: 1,
        home: 1,
        homeRoom: room({ ns: "A1NS", ew: "A2EW", nsScore: 430 }),
        // Played the wrong way round: the partnerships are exchanged.
        awayRoom: room({
          tableNumber: 2,
          ns: "A2NS",
          ew: "A1EW",
          seatsSwapped: true,
        }),
      },
      {
        boardNumber: 2,
        home: null,
        homeRoom: null,
        awayRoom: room({
          boardNumber: 2,
          tableNumber: 2,
          ns: "A2NS",
          ew: "A1EW",
        }),
      },
    ],
    homeScore: 12,
    opponentScore: 8,
    boardsPlayed: 1,
    void: false,
  };

  // An unknown team id in a match keeps its raw id as the number.
  const offRoster: TeamMatchResult = {
    ...match,
    round: 2,
    home: "A9NS",
    boards: [{ boardNumber: 3, home: 0.5, homeRoom: null, awayRoom: null }],
  };

  const vpStandings: OverallScore = {
    type: "TEAM_SWISS_VP",
    mode: "TEAM",
    scoring: "SWISS_VP",
    lines: [
      { teamId: "A1NS", totalVP: 24, vpByRound: {}, rank: 1, tied: false },
      { teamId: "A2NS", totalVP: 8, vpByRound: {}, rank: 2, tied: false },
    ],
  };

  it("Swiss Teams: writes the match VP, the board IMPs and both rooms (E9 credit is in the total)", () => {
    const data = buildUsebioData(
      snapshot({
        format: "TEAMS_VP",
        teams,
        teamMatches: [match],
        fields: [field({ standings: vpStandings })],
      }),
    ) as UsebioSwissTeamsData;

    expect(data.kind).toBe("SWISS_TEAMS");
    expect(data.matchScoringMethod).toBe("VPS");
    expect(data.teams.map((t) => [t.teamNumber, t.teamName])).toEqual([
      ["1", "Team One"],
      ["2", "Team Two"],
    ]);
    expect(data.matches[0]).toMatchObject({
      team: "1",
      opposingTeam: "2",
      startBoard: 1,
      endBoard: 2,
      teamScore: 12,
      opposingTeamScore: 8,
    });
    const [b1, b2] = data.matches[0].boards;
    expect(b1.imps).toBe(1);
    expect(b1.travellerLines.map((l) => l.direction)).toEqual(["NS", "EW"]);
    expect(b1.travellerLines[0]).toMatchObject({
      nsPairNumber: "1NS",
      ewPairNumber: "2EW",
      score: "430",
    });
    // The swapped room names the partnerships the other way round.
    expect(b1.travellerLines[1]).toMatchObject({
      nsPairNumber: "1EW",
      ewPairNumber: "2NS",
    });
    // Not comparable yet: 0 IMPs, and only the room that played it.
    expect(b2.imps).toBe(0);
    expect(b2.travellerLines.map((l) => l.direction)).toEqual(["EW"]);
    // The ranking total includes any bye credit (E9) from the standings.
    expect(data.ranking).toEqual([
      { number: "1", sectionId: "A", totalVP: 24, place: 1 },
      { number: "2", sectionId: "A", totalVP: 8, place: 2 },
    ]);
  });

  it("aggregate IMPs: writes IMPS scoring and ranks on total IMPs", () => {
    const data = buildUsebioData(
      snapshot({
        format: "TEAMS_IMP_AGG",
        teams,
        teamMatches: [{ ...match, homeScore: 3, opponentScore: -3 }, offRoster],
        fields: [
          field({
            standings: {
              type: "TEAM_IMP_AGG",
              mode: "TEAM",
              scoring: "IMP_AGG",
              barometer: true,
              lines: [
                {
                  teamId: "A1NS",
                  totalImps: 3,
                  impsByRound: {},
                  rank: 1,
                  tied: false,
                },
              ],
            },
          }),
        ],
      }),
    ) as UsebioSwissTeamsData;

    expect(data.matchScoringMethod).toBe("IMPS");
    expect(data.matches[0]).toMatchObject({
      teamScore: 3,
      opposingTeamScore: -3,
    });
    expect(data.matches[1].team).toBe("A9NS");
    expect(data.ranking).toEqual([
      { number: "1", sectionId: "A", totalVP: 3, place: 1 },
    ]);
  });

  it("board comparison: scales boards won onto the point-a-board scale", () => {
    const data = buildUsebioData(
      snapshot({
        format: "TEAMS_PAB",
        teams,
        teamMatches: [{ ...match, homeScore: 1, opponentScore: 0 }],
        fields: [
          field({
            standings: {
              type: "TEAM_PAB",
              mode: "TEAM",
              scoring: "PAB",
              barometer: true,
              lines: [
                {
                  teamId: "A1NS",
                  totalWon: 1.5,
                  totalPlayed: 2,
                  byRound: {},
                  rank: 1,
                  tied: false,
                },
              ],
            },
          }),
        ],
      }),
    ) as UsebioBoardComparisonTeamsData;

    expect(data.kind).toBe("BOARD_COMPARISON_TEAMS");
    expect(data.scoring).toBe("PAB");
    expect(data.matches[0]).toMatchObject({
      teamScore: 2,
      opposingTeamScore: 0,
    });
    // A won board (1) is 2 points to 0; a board not comparable yet is 0 / 0.
    expect(
      data.matches[0].boards.map((b) => [b.teamPoints, b.opposingTeamPoints]),
    ).toEqual([
      [2, 0],
      [0, 0],
    ]);
    expect(data.ranking).toEqual([
      { number: "1", sectionId: "A", totalWon: 3, place: 1 },
    ]);
  });

  it("board comparison: board-a-match keeps one point a board", () => {
    const data = buildUsebioData(
      snapshot({
        format: "TEAMS_BAM",
        teams,
        teamMatches: [offRoster],
        fields: [field({})],
      }),
    ) as UsebioBoardComparisonTeamsData;

    expect(data.scoring).toBe("BAM");
    // A tied board is half a point each.
    expect(data.matches[0].boards[0]).toMatchObject({
      teamPoints: 0.5,
      opposingTeamPoints: 0.5,
    });
  });

  it("writes one SECTION per field (E4)", () => {
    const data = buildUsebioData(
      snapshot({
        format: "TEAMS_VP",
        teams,
        teamMatches: [match, { ...match, field: "B", section: "B" }],
        fields: [
          field({ standings: vpStandings }),
          field({ field: "B", sectionId: "B", standings: vpStandings }),
        ],
      }),
    ) as UsebioSwissTeamsData;

    expect(data.sections).toEqual(["A", "B"]);
    expect(data.matches.map((m) => m.section)).toEqual(["A", "B"]);
    expect(data.teams.map((t) => t.sectionId)).toEqual(["A", "A", "B", "B"]);
  });
});
