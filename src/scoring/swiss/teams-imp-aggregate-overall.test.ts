import { describe, expect, it } from "vitest";

import { SwissVpBoardRow } from "./swiss-vp-overall";
import { calculateTeamsImpAggregateOverall as calculateTeamsImpAggregateOverallImpl } from "./teams-imp-aggregate-overall";
import { teamMatchStructureFromRows } from "./team-match-test-structure";

// The teams scorers now take `matches` rows as structure; derive them from each
// scenario's board rows via the test-only helper. Int tests cover the
// materialiser-written path.
function calculateTeamsImpAggregateOverall(
  boardRows: SwissVpBoardRow[],
  options: { barometer: boolean },
) {
  return calculateTeamsImpAggregateOverallImpl(
    boardRows,
    teamMatchStructureFromRows(boardRows),
    options,
  );
}

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

describe("calculateTeamsImpAggregateOverall", () => {
  it("returns empty, well-formed metadata for no rows", () => {
    const result = calculateTeamsImpAggregateOverall([], { barometer: false });
    expect(result.type).toBe("TEAM_IMP_AGG");
    expect(result.mode).toBe("TEAM");
    expect(result.scoring).toBe("IMP_AGG");
    expect(result.barometer).toBe(false);
    expect(result.lines).toHaveLength(0);
  });

  it("carries the barometer flag through", () => {
    const result = calculateTeamsImpAggregateOverall([], { barometer: true });
    expect(result.barometer).toBe(true);
  });

  it("credits the net IMP margin to the winner and its negation to the loser", () => {
    // Match {team 1, team 2} across tables 1 and 2, board 1 (None vul).
    //  - Table 1 (team 1 home): team 1 NS makes 3NT+1 = +430.
    //  - Table 2 (team 2 home): team 2 NS makes 3NT=  = +400.
    // Team 1 net = 430 - 400 = +30 -> +1 IMP to team 1 (and -1 to team 2).
    const rows: SwissVpBoardRow[] = [
      row({ tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: "3NTN+1" }),
      row({ tableNumber: 2, ns: "A2NS", ew: "A1EW", confirmedResult: "3NTN=" }),
    ];

    const result = calculateTeamsImpAggregateOverall(rows, { barometer: true });

    const t1 = result.lines.find((l) => l.teamId === "A1NS")!;
    const t2 = result.lines.find((l) => l.teamId === "A2NS")!;

    // No VP conversion: the totals are the raw net IMPs, equal and opposite.
    expect(t1.totalImps).toBe(1);
    expect(t2.totalImps).toBe(-1);
    expect(t1.impsByRound[1]).toBe(1);
    expect(t2.impsByRound[1]).toBe(-1);

    // The winner (positive aggregate) ranks first.
    expect(result.lines[0].teamId).toBe("A1NS");
  });

  it("sums net IMPs across rounds", () => {
    const rows: SwissVpBoardRow[] = [
      // Round 1: team 1 +30 (+1 IMP).
      row({
        roundNumber: 1,
        tableNumber: 1,
        ns: "A1NS",
        ew: "A2EW",
        confirmedResult: "3NTN+1",
      }),
      row({
        roundNumber: 1,
        tableNumber: 2,
        ns: "A2NS",
        ew: "A1EW",
        confirmedResult: "3NTN=",
      }),
      // Round 2: same teams meet again (fresh board), team 1 +30 (+1 IMP) again.
      row({
        roundNumber: 2,
        boardNumber: 2,
        tableNumber: 1,
        ns: "A1NS",
        ew: "A2EW",
        confirmedResult: "3NTN+1",
      }),
      row({
        roundNumber: 2,
        boardNumber: 2,
        tableNumber: 2,
        ns: "A2NS",
        ew: "A1EW",
        confirmedResult: "3NTN=",
      }),
    ];

    const result = calculateTeamsImpAggregateOverall(rows, { barometer: true });

    const t1 = result.lines.find((l) => l.teamId === "A1NS")!;
    expect(t1.impsByRound[1]).toBe(1);
    expect(t1.impsByRound[2]).toBe(1);
    expect(t1.totalImps).toBe(2);
  });
});

describe("calculateTeamsImpAggregateOverall — §3.3.7 removed boards", () => {
  it("adds the ±3 IMP indemnity to the aggregate (EW at fault → +3 home / -3 away)", () => {
    const rows: SwissVpBoardRow[] = [
      row({
        boardNumber: 1,
        tableNumber: 1,
        ns: "A1NS",
        ew: "A2EW",
        status: "REMOVED_TEAMS",
        directorOverrideResult: "TRM:EW_FAULT" as never,
      }),
    ];

    const result = calculateTeamsImpAggregateOverall(rows, { barometer: false });
    const t1 = result.lines.find((l) => l.teamId === "A1NS")!;
    const t2 = result.lines.find((l) => l.teamId === "A2NS")!;
    expect(t1.totalImps).toBe(3);
    expect(t2.totalImps).toBe(-3);
  });
});
describe("calculateTeamsImpAggregateOverall — triples and byes", () => {
  it("credits each SHORT triple team the net IMPs from its two comparisons", () => {
    // Same SHORT triple as the VP test: three one-board head-to-head sets,
    // each decided by +1 IMP (420 vs 400).
    const rows: SwissVpBoardRow[] = [
      row({ boardNumber: 1, tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: "4SN=" }),
      row({ boardNumber: 1, tableNumber: 2, ns: "A2NS", ew: "A1EW", confirmedResult: "3NTN=" }),
      row({ boardNumber: 2, tableNumber: 2, ns: "A2NS", ew: "A3EW", confirmedResult: "4SN=" }),
      row({ boardNumber: 2, tableNumber: 3, ns: "A3NS", ew: "A2EW", confirmedResult: "3NTN=" }),
      row({ boardNumber: 3, tableNumber: 3, ns: "A3NS", ew: "A1EW", confirmedResult: "3NTN=" }),
      row({ boardNumber: 3, tableNumber: 1, ns: "A1NS", ew: "A3EW", confirmedResult: "4SN=" }),
    ];
    const result = calculateTeamsImpAggregateOverall(rows, { barometer: false });
    const imps = (id: string) =>
      result.lines.find((l) => l.teamId === id)!.impsByRound[1];
    // team 1 beats 2 and 3 (+1 each); team 2 loses to 1, beats 3; team 3 loses both.
    expect(imps("A1NS")).toBe(2);
    expect(imps("A2NS")).toBe(0);
    expect(imps("A3NS")).toBe(-2);
  });

  it("records a bye team on the table with 0 IMPs", () => {
    const rows: SwissVpBoardRow[] = [
      row({ tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: "3NTN=" }),
      row({ tableNumber: 2, ns: "A2NS", ew: "A1EW", confirmedResult: "3NTN=" }),
      row({
        tableNumber: 3,
        ns: "A3NS",
        ew: "PHANTOM",
        confirmedResult: null,
        status: "SIT_OUT",
      }),
    ];
    const result = calculateTeamsImpAggregateOverall(rows, { barometer: false });
    const bye = result.lines.find((l) => l.teamId === "A3NS")!;
    expect(bye.totalImps).toBe(0);
    expect(bye.impsByRound[1]).toBe(0);
  });
});
