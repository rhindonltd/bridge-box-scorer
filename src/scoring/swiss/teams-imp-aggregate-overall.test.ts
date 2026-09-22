import { describe, expect, it } from "vitest";

import { SwissVpBoardRow } from "./swiss-vp-overall";
import { calculateTeamsImpAggregateOverall } from "./teams-imp-aggregate-overall";

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
