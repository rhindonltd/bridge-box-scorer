import { describe, expect, it } from "vitest";
import { SwissVpBoardRow } from "./swiss-vp-overall";
import { calculateSwissTeamsVpOverall } from "./swiss-teams-vp-overall";

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

describe("calculateSwissTeamsVpOverall", () => {
  it("returns empty, well-formed metadata for no rows", () => {
    const result = calculateSwissTeamsVpOverall([]);
    expect(result.type).toBe("TEAM_SWISS_VP");
    expect(result.mode).toBe("TEAM");
    expect(result.scoring).toBe("SWISS_VP");
    expect(result.lines).toHaveLength(0);
  });

  it("compares the two tables of a match and awards VP by the IMP margin", () => {
    // Match {team 1, team 2} across tables 1 and 2, board 1 (None vul).
    //  - Table 1 (team 1 home): team 1 NS makes 3NT+1 = +430.
    //  - Table 2 (team 2 home): team 2 NS makes 3NT= = +400.
    // Team 1 net = 430 - 400 = +30 -> 1 IMP to team 1 over 1 board.
    const rows: SwissVpBoardRow[] = [
      row({
        tableNumber: 1,
        ns: "A1NS",
        ew: "A2EW",
        confirmedResult: "3NTN+1",
      }),
      row({
        tableNumber: 2,
        ns: "A2NS",
        ew: "A1EW",
        confirmedResult: "3NTN=",
      }),
    ];

    const result = calculateSwissTeamsVpOverall(rows);

    const t1 = result.lines.find((l) => l.teamId === "A1NS")!;
    const t2 = result.lines.find((l) => l.teamId === "A2NS")!;
    expect(t1).toBeDefined();
    expect(t2).toBeDefined();

    // The two teams split exactly 20 VP; team 1 (the winner) ranks first.
    expect(Math.round((t1.vpByRound[1] + t2.vpByRound[1]) * 100) / 100).toBe(20);
    expect(t1.vpByRound[1]).toBeGreaterThan(10);
    expect(t2.vpByRound[1]).toBeLessThan(10);
    expect(result.lines[0].teamId).toBe("A1NS");
    expect(t1.totalVP).toBe(t1.vpByRound[1]);
  });

  it("splits 10/10 when the two tables tie on the board", () => {
    const rows: SwissVpBoardRow[] = [
      row({ tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: "3NTN=" }),
      row({ tableNumber: 2, ns: "A2NS", ew: "A1EW", confirmedResult: "3NTN=" }),
    ];

    const result = calculateSwissTeamsVpOverall(rows);
    for (const line of result.lines) {
      expect(line.vpByRound[1]).toBe(10);
    }
  });

  it("shows a neutral 10 for a drawn round with no results yet", () => {
    const rows: SwissVpBoardRow[] = [
      row({ tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: null }),
      row({ tableNumber: 2, ns: "A2NS", ew: "A1EW", confirmedResult: null }),
    ];

    const result = calculateSwissTeamsVpOverall(rows);
    expect(result.lines).toHaveLength(2);
    for (const line of result.lines) {
      expect(line.vpByRound[1]).toBe(10);
    }
  });

  it("only counts boards scored at BOTH tables (running estimate)", () => {
    // Board 1 scored at both tables; board 2 only at table 1 -> counts board 1
    // only, still producing a live VP rather than waiting for the full match.
    const rows: SwissVpBoardRow[] = [
      row({ tableNumber: 1, boardNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: "3NTN+1" }),
      row({ tableNumber: 2, boardNumber: 1, ns: "A2NS", ew: "A1EW", confirmedResult: "3NTN=" }),
      row({ tableNumber: 1, boardNumber: 2, ns: "A1NS", ew: "A2EW", confirmedResult: "3NTN=" }),
      row({ tableNumber: 2, boardNumber: 2, ns: "A2NS", ew: "A1EW", confirmedResult: null }),
    ];

    const result = calculateSwissTeamsVpOverall(rows);
    const t1 = result.lines.find((l) => l.teamId === "A1NS")!;
    // Only board 1 counts so far; team 1 leads and its cell is above neutral.
    expect(t1.vpByRound[1]).toBeGreaterThan(10);
  });

  it("uses the director override result over the confirmed result", () => {
    const rows: SwissVpBoardRow[] = [
      row({
        tableNumber: 1,
        ns: "A1NS",
        ew: "A2EW",
        confirmedResult: "1NTN=",
        directorOverrideResult: "6NTN=",
      }),
      row({ tableNumber: 2, ns: "A2NS", ew: "A1EW", confirmedResult: "3NTN=" }),
    ];

    const result = calculateSwissTeamsVpOverall(rows);
    const t1 = result.lines.find((l) => l.teamId === "A1NS")!;
    const t2 = result.lines.find((l) => l.teamId === "A2NS")!;
    // The override (a slam at table 1) makes team 1 the clear winner.
    expect(t1.vpByRound[1]).toBeGreaterThan(t2.vpByRound[1]);
  });
});
