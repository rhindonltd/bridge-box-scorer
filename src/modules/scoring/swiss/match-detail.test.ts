import { describe, expect, it } from "vitest";

import { pairsMatchDetail, type SwissVpBoardRow } from "./swiss-vp-overall";
import type { TeamMatchDetail } from "./match-detail";
import { calculateTeamsImpAggregateOverall } from "./teams-imp-aggregate-overall";
import { calculateTeamsVpOverall } from "./teams-vp-overall";
import { calculateTeamsBoardComparisonOverall } from "./teams-board-comparison-overall";
import { teamMatchStructureFromRows } from "./team-match-test-structure";

function row(overrides: Partial<SwissVpBoardRow>): SwissVpBoardRow {
  return {
    section: "A",
    roundNumber: 1,
    tableNumber: 1,
    boardNumber: 1,
    ns: "A1NS",
    ew: "A2EW",
    confirmedResult: null,
    directorOverrideResult: null,
    status: "COMPLETE",
    ...overrides,
  };
}

/**
 * Round 1: a SHORT triple between teams 1, 2 and 3 (one board each pair of
 * teams, team 1 beats both, team 2 beats team 3, each by 420 v 400 = 1 IMP).
 * Round 2: an ordinary match, team 1 v team 2 (team 1 +30 = 1 IMP).
 */
const rows: SwissVpBoardRow[] = [
  row({
    boardNumber: 1,
    tableNumber: 1,
    ns: "A1NS",
    ew: "A2EW",
    confirmedResult: "4SN=",
  }),
  row({
    boardNumber: 1,
    tableNumber: 2,
    ns: "A2NS",
    ew: "A1EW",
    confirmedResult: "3NTN=",
  }),
  row({
    boardNumber: 2,
    tableNumber: 2,
    ns: "A2NS",
    ew: "A3EW",
    confirmedResult: "4SN=",
  }),
  row({
    boardNumber: 2,
    tableNumber: 3,
    ns: "A3NS",
    ew: "A2EW",
    confirmedResult: "3NTN=",
  }),
  row({
    boardNumber: 3,
    tableNumber: 3,
    ns: "A3NS",
    ew: "A1EW",
    confirmedResult: "3NTN=",
  }),
  row({
    boardNumber: 3,
    tableNumber: 1,
    ns: "A1NS",
    ew: "A3EW",
    confirmedResult: "4SN=",
  }),
  row({
    roundNumber: 2,
    boardNumber: 4,
    tableNumber: 1,
    ns: "A1NS",
    ew: "A2EW",
    confirmedResult: "3NTN+1",
  }),
  row({
    roundNumber: 2,
    boardNumber: 4,
    tableNumber: 2,
    ns: "A2NS",
    ew: "A1EW",
    confirmedResult: "3NTN=",
  }),
];
const matchRows = teamMatchStructureFromRows(rows);

/** Each team's total of its recorded match scores. */
function totalsOf(matches: TeamMatchDetail<SwissVpBoardRow>[]) {
  const totals = new Map<string, number>();
  for (const m of matches) {
    totals.set(m.home, (totals.get(m.home) ?? 0) + m.homeScore);
    totals.set(m.opponent, (totals.get(m.opponent) ?? 0) + m.opponentScore);
  }
  return totals;
}

describe("teams scorers record each match as they credit it", () => {
  it("aggregate IMPs: the triple's comparisons and the match add up to the standings", () => {
    const matches: TeamMatchDetail<SwissVpBoardRow>[] = [];
    const score = calculateTeamsImpAggregateOverall(rows, matchRows, {
      barometer: true,
      matches,
    });

    expect(matches.map((m) => m.triple)).toEqual([
      null,
      "SHORT",
      "SHORT",
      "SHORT",
    ]);
    const totals = totalsOf(matches);
    for (const line of score.lines) {
      expect(totals.get(line.teamId)).toBe(line.totalImps);
    }
    // The ordinary match: team 1's home table and team 2's, board 4.
    expect(matches[0]).toMatchObject({
      round: 2,
      home: "A1NS",
      opponent: "A2NS",
      homeScore: 1,
      opponentScore: -1,
      boardsPlayed: 1,
      void: false,
    });
    expect(matches[0].boards).toEqual([
      expect.objectContaining({
        boardNumber: 4,
        home: 1,
        homeRow: rows[6],
        awayRow: rows[7],
      }),
    ]);
  });

  it("VP: each side's recorded VP is what the standings total", () => {
    const matches: TeamMatchDetail<SwissVpBoardRow>[] = [];
    const score = calculateTeamsVpOverall(rows, matchRows, { matches });

    const totals = totalsOf(matches);
    for (const line of score.lines) {
      expect(totals.get(line.teamId)).toBe(line.totalVP);
    }
    // A SHORT triple comparison is on the 10-VP half pool.
    const triple = matches.filter((m) => m.triple === "SHORT");
    expect(triple).toHaveLength(3);
    for (const m of triple) expect(m.homeScore + m.opponentScore).toBe(10);
  });

  it("board comparison: boards won are recorded in native board units", () => {
    const matches: TeamMatchDetail<SwissVpBoardRow>[] = [];
    const score = calculateTeamsBoardComparisonOverall(rows, matchRows, {
      barometer: true,
      scoring: "BAM",
      matches,
    });

    const totals = totalsOf(matches);
    for (const line of score.lines) {
      expect(totals.get(line.teamId)).toBe(line.totalWon);
    }
    expect(matches[0].boards[0].home).toBe(1);
  });
});

describe("pairsMatchDetail", () => {
  it("finds a match's board row whichever way round the pairs sat", () => {
    const sat = row({ ns: "A2", ew: "A1", boardNumber: 5 });
    const detail = pairsMatchDetail(3, [row({ ns: "A3", ew: "A4" }), sat], {
      nsId: "A1",
      ewId: "A2",
      nsVp: 12,
      ewVp: 8,
      boardNumbers: [5],
    });
    expect(detail).toEqual({
      nsId: "A1",
      ewId: "A2",
      nsVp: 12,
      ewVp: 8,
      boardNumbers: [5],
      round: 3,
      rows: [sat],
    });
  });
});
