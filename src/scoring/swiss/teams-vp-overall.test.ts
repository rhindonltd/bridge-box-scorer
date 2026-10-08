import { describe, expect, it } from "vitest";
import { SwissVpBoardRow } from "./swiss-vp-overall";
import { calculateTeamsVpOverall } from "./teams-vp-overall";

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

describe("calculateTeamsVpOverall", () => {
  it("returns empty, well-formed metadata for no rows", () => {
    const result = calculateTeamsVpOverall([]);
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

    const result = calculateTeamsVpOverall(rows);

    const t1 = result.lines.find((l) => l.teamId === "A1NS")!;
    const t2 = result.lines.find((l) => l.teamId === "A2NS")!;
    expect(t1).toBeDefined();
    expect(t2).toBeDefined();

    // The two teams split exactly 20 VP; team 1 (the winner) ranks first.
    expect(Math.round((t1.vpByRound[1] + t2.vpByRound[1]) * 100) / 100).toBe(
      20,
    );
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

    const result = calculateTeamsVpOverall(rows);
    for (const line of result.lines) {
      expect(line.vpByRound[1]).toBe(10);
    }
  });

  it("shows a neutral 10 for a drawn round with no results yet", () => {
    const rows: SwissVpBoardRow[] = [
      row({ tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: null }),
      row({ tableNumber: 2, ns: "A2NS", ew: "A1EW", confirmedResult: null }),
    ];

    const result = calculateTeamsVpOverall(rows);
    expect(result.lines).toHaveLength(2);
    for (const line of result.lines) {
      expect(line.vpByRound[1]).toBe(10);
    }
  });

  it("only counts boards scored at BOTH tables (running estimate)", () => {
    // Board 1 scored at both tables; board 2 only at table 1 -> counts board 1
    // only, still producing a live VP rather than waiting for the full match.
    const rows: SwissVpBoardRow[] = [
      row({
        tableNumber: 1,
        boardNumber: 1,
        ns: "A1NS",
        ew: "A2EW",
        confirmedResult: "3NTN+1",
      }),
      row({
        tableNumber: 2,
        boardNumber: 1,
        ns: "A2NS",
        ew: "A1EW",
        confirmedResult: "3NTN=",
      }),
      row({
        tableNumber: 1,
        boardNumber: 2,
        ns: "A1NS",
        ew: "A2EW",
        confirmedResult: "3NTN=",
      }),
      row({
        tableNumber: 2,
        boardNumber: 2,
        ns: "A2NS",
        ew: "A1EW",
        confirmedResult: null,
      }),
    ];

    const result = calculateTeamsVpOverall(rows);
    const t1 = result.lines.find((l) => l.teamId === "A1NS")!;
    // Only board 1 counts so far; team 1 leads and its cell is above neutral.
    expect(t1.vpByRound[1]).toBeGreaterThan(10);
  });

  it("awards the win to the opponent team when the margin is negative", () => {
    // Table 1 (home team A1) NS makes only 3NT= (+400); table 2 (opponent A2)
    // NS makes 3NT+1 (+430). The home team's net is negative, so the opponent
    // team wins the match.
    const rows: SwissVpBoardRow[] = [
      row({ tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: "3NTN=" }),
      row({
        tableNumber: 2,
        ns: "A2NS",
        ew: "A1EW",
        confirmedResult: "3NTN+1",
      }),
    ];

    const result = calculateTeamsVpOverall(rows);
    const t1 = result.lines.find((l) => l.teamId === "A1NS")!;
    const t2 = result.lines.find((l) => l.teamId === "A2NS")!;
    expect(t2.vpByRound[1]).toBeGreaterThan(t1.vpByRound[1]);
    expect(Math.round((t1.vpByRound[1] + t2.vpByRound[1]) * 100) / 100).toBe(
      20,
    );
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

    const result = calculateTeamsVpOverall(rows);
    const t1 = result.lines.find((l) => l.teamId === "A1NS")!;
    const t2 = result.lines.find((l) => l.teamId === "A2NS")!;
    // The override (a slam at table 1) makes team 1 the clear winner.
    expect(t1.vpByRound[1]).toBeGreaterThan(t2.vpByRound[1]);
  });

  it("credits each SHORT triple team the sum of its two head-to-head comparison VPs", () => {
    // SHORT triple {1,2,3}, one round, three one-board head-to-head sets:
    //   set A (board 1): 1·NS 4S= (420) vs 2·NS 3NT= (400) -> team 1 by +1 imp
    //   set B (board 2): 2·NS 4S= (420) vs 3·NS 3NT= (400) -> team 2 by +1 imp
    //   set C (board 3): 1·NS 4S= (420) vs 3·NS 3NT= (400) -> team 1 by +1 imp
    // Each comparison is one board on the 10-VP half pool: imps(20)=1 ->
    // winner impVpWinner(1,1,10)=6, loser 10-6=4. Each team sums its two
    // comparisons into the single round (/20):
    //   team 1 = 6 (1-2) + 6 (1-3) = 12   (clear winner, >10)
    //   team 2 = 4 (1-2) + 6 (2-3) = 10
    //   team 3 = 4 (2-3) + 4 (1-3) = 8    (clear loser, <10)
    // The three comparisons each split 10 VP, so the round total is 3×10 = 30.
    const rows: SwissVpBoardRow[] = [
      // set A board 1: comparison 1-2
      row({ boardNumber: 1, tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: "4SN=" }),
      row({ boardNumber: 1, tableNumber: 2, ns: "A2NS", ew: "A1EW", confirmedResult: "3NTN=" }),
      // set B board 2: comparison 2-3
      row({ boardNumber: 2, tableNumber: 2, ns: "A2NS", ew: "A3EW", confirmedResult: "4SN=" }),
      row({ boardNumber: 2, tableNumber: 3, ns: "A3NS", ew: "A2EW", confirmedResult: "3NTN=" }),
      // set C board 3: comparison 1-3
      row({ boardNumber: 3, tableNumber: 3, ns: "A3NS", ew: "A1EW", confirmedResult: "3NTN=" }),
      row({ boardNumber: 3, tableNumber: 1, ns: "A1NS", ew: "A3EW", confirmedResult: "4SN=" }),
    ];

    const result = calculateTeamsVpOverall(rows);
    const t1 = result.lines.find((l) => l.teamId === "A1NS")!;
    const t2 = result.lines.find((l) => l.teamId === "A2NS")!;
    const t3 = result.lines.find((l) => l.teamId === "A3NS")!;

    expect(t1).toBeDefined();
    // Each team's round VP is on the /20 pool (sum of two 10-pool halves).
    expect(t1.vpByRound[1]).toBe(12);
    expect(t2.vpByRound[1]).toBe(10);
    expect(t3.vpByRound[1]).toBe(8);
    // The clear winner is above the neutral 10 and the clear loser below it.
    expect(t1.vpByRound[1]).toBeGreaterThan(10);
    expect(t3.vpByRound[1]).toBeLessThan(10);
    // Three comparisons each split a 10-VP pool -> 30 across the round.
    expect(t1.vpByRound[1] + t2.vpByRound[1] + t3.vpByRound[1]).toBe(30);
  });

  it("sits triple teams at the neutral 10 when nothing is comparable yet", () => {
    // Only one room of the SHORT triple entered a result, so no comparison has
    // both rooms scored -> each comparison sits at its 5-neutral half, and a
    // team's two halves sum to the round's neutral 10.
    const rows: SwissVpBoardRow[] = [
      row({ boardNumber: 1, tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: "4SN=" }),
      row({ boardNumber: 1, tableNumber: 2, ns: "A2NS", ew: "A1EW", confirmedResult: null }),
      row({ boardNumber: 2, tableNumber: 2, ns: "A2NS", ew: "A3EW", confirmedResult: null }),
      row({ boardNumber: 2, tableNumber: 3, ns: "A3NS", ew: "A2EW", confirmedResult: null }),
      row({ boardNumber: 3, tableNumber: 3, ns: "A3NS", ew: "A1EW", confirmedResult: null }),
      row({ boardNumber: 3, tableNumber: 1, ns: "A1NS", ew: "A3EW", confirmedResult: null }),
    ];

    const result = calculateTeamsVpOverall(rows);
    expect(result.lines).toHaveLength(3);
    for (const line of result.lines) {
      expect(line.vpByRound[1]).toBe(10);
    }
  });

  it("credits a bye team an average-plus 12 VP for its sit-out round", () => {
    // Teams 1 v 2 play round 1; team 3 sits out (SIT_OUT rows on its home
    // table with a phantom opponent).
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

    const result = calculateTeamsVpOverall(rows);
    const bye = result.lines.find((l) => l.teamId === "A3NS")!;
    expect(bye).toBeDefined();
    expect(bye.vpByRound[1]).toBe(12);
    // The playing teams tied on the one board -> neutral 10 each (not 12).
    const t1 = result.lines.find((l) => l.teamId === "A1NS")!;
    expect(t1.vpByRound[1]).toBe(10);
  });
});

describe("calculateTeamsVpOverall — §3.3.7 removed boards", () => {
  function removed(fault: string, overrides: Partial<SwissVpBoardRow>) {
    return row({
      status: "REMOVED_TEAMS",
      directorOverrideResult: `TRM:${fault}` as never,
      confirmedResult: null,
      ...overrides,
    });
  }

  it("gives the home team a +3 IMP swing when the opponents are at fault", () => {
    // Board 1 played (teams tie, 0 imps); board 2 removed with EW at fault on
    // the home row -> +3 IMPs to the home team (A1), counted as a played board.
    const rows: SwissVpBoardRow[] = [
      row({ boardNumber: 1, tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: "3NTN=" }),
      row({ boardNumber: 1, tableNumber: 2, ns: "A2NS", ew: "A1EW", confirmedResult: "3NTN=" }),
      // Removed board 2: marked on the home table (table 1), EW at fault.
      removed("EW_FAULT", { boardNumber: 2, tableNumber: 1, ns: "A1NS", ew: "A2EW" }),
    ];

    const result = calculateTeamsVpOverall(rows);
    const t1 = result.lines.find((l) => l.teamId === "A1NS")!;
    const t2 = result.lines.find((l) => l.teamId === "A2NS")!;
    // Net margin +3 to the home team over 2 boards -> home above neutral.
    expect(t1.vpByRound[1]).toBeGreaterThan(10);
    expect(t2.vpByRound[1]).toBeLessThan(10);
    expect(Math.round((t1.vpByRound[1] + t2.vpByRound[1]) * 100) / 100).toBe(20);
  });

  it("gives the home team a -3 IMP swing when the home side is at fault", () => {
    const rows: SwissVpBoardRow[] = [
      row({ boardNumber: 1, tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: "3NTN=" }),
      row({ boardNumber: 1, tableNumber: 2, ns: "A2NS", ew: "A1EW", confirmedResult: "3NTN=" }),
      removed("NS_FAULT", { boardNumber: 2, tableNumber: 1, ns: "A1NS", ew: "A2EW" }),
    ];

    const result = calculateTeamsVpOverall(rows);
    const t1 = result.lines.find((l) => l.teamId === "A1NS")!;
    const t2 = result.lines.find((l) => l.teamId === "A2NS")!;
    expect(t1.vpByRound[1]).toBeLessThan(10);
    expect(t2.vpByRound[1]).toBeGreaterThan(10);
  });

  it("reads the fault from the opponent room and inverts it to the home perspective", () => {
    // The removal is recorded on table 2 (the opponent room: NS = A2, EW = A1)
    // with EW_FAULT. On that row EW = A1, so A1 (the home team) is the one at
    // fault and should be penalised: team 2 comes out ahead.
    const rows: SwissVpBoardRow[] = [
      row({ boardNumber: 1, tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: "3NTN=" }),
      row({ boardNumber: 1, tableNumber: 2, ns: "A2NS", ew: "A1EW", confirmedResult: "3NTN=" }),
      removed("EW_FAULT", { boardNumber: 2, tableNumber: 2, ns: "A2NS", ew: "A1EW" }),
    ];

    const result = calculateTeamsVpOverall(rows);
    const t1 = result.lines.find((l) => l.teamId === "A1NS")!;
    const t2 = result.lines.find((l) => l.teamId === "A2NS")!;
    // On the opponent row EW = A1 is at fault -> A1 penalised -> A2 ahead.
    expect(t2.vpByRound[1]).toBeGreaterThan(t1.vpByRound[1]);
  });

  it("§3.3.6.2: averages un-played boards (neither-fault removal) on the full scale", () => {
    // A valid match: board 1 played with a big home win; board 2 un-played and
    // averaged (NEITHER_FAULT removal → 0 swing). The averaged board counts, so
    // the margin is scored over 2 boards, not 1.
    const rows: SwissVpBoardRow[] = [
      row({ boardNumber: 1, tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: "6NTN=" }),
      row({ boardNumber: 1, tableNumber: 2, ns: "A2NS", ew: "A1EW", confirmedResult: "3NTN=" }),
      removed("NEITHER_FAULT", { boardNumber: 2, tableNumber: 1, ns: "A1NS", ew: "A2EW" }),
    ];

    const result = calculateTeamsVpOverall(rows);
    const t1 = result.lines.find((l) => l.teamId === "A1NS")!;
    const t2 = result.lines.find((l) => l.teamId === "A2NS")!;
    // Home won big on the one real board, averaged the other -> home ahead.
    expect(t1.vpByRound[1]).toBeGreaterThan(10);
    expect(t2.vpByRound[1]).toBeLessThan(10);
  });

  it("counts a removed board toward the match (neither-at-fault nets to a tie)", () => {
    // A single removed board, neither at fault: 0 net margin over 1 board ->
    // both teams at the neutral 10, but the board DID count (not a 0-board
    // drawn-match skip — same neutral result, reached via the swing path).
    const rows: SwissVpBoardRow[] = [
      removed("NEITHER_FAULT", { boardNumber: 1, tableNumber: 1, ns: "A1NS", ew: "A2EW" }),
      row({ boardNumber: 1, tableNumber: 2, ns: "A2NS", ew: "A1EW", confirmedResult: null }),
    ];

    const result = calculateTeamsVpOverall(rows);
    const t1 = result.lines.find((l) => l.teamId === "A1NS")!;
    const t2 = result.lines.find((l) => l.teamId === "A2NS")!;
    expect(t1.vpByRound[1]).toBe(10);
    expect(t2.vpByRound[1]).toBe(10);
  });
});

describe("calculateTeamsVpOverall — §3.3.6/§3.3.9 void matches", () => {
  function voided(cause: string, overrides: Partial<SwissVpBoardRow>) {
    return row({
      status: "VOID_MATCH",
      directorOverrideResult: `VOID:${cause}` as never,
      confirmedResult: null,
      ...overrides,
    });
  }

  it("credits both teams 40% VP for an incorrect-seating void (§3.3.6.1)", () => {
    const rows: SwissVpBoardRow[] = [
      voided("SEATING_STANDARD", { boardNumber: 1, tableNumber: 1, ns: "A1NS", ew: "A2EW" }),
      voided("SEATING_STANDARD", { boardNumber: 1, tableNumber: 2, ns: "A2NS", ew: "A1EW" }),
    ];
    const result = calculateTeamsVpOverall(rows);
    for (const line of result.lines) {
      expect(line.vpByRound[1]).toBe(8);
    }
  });

  it("credits both teams the 60% converse when the TD was at fault", () => {
    const rows: SwissVpBoardRow[] = [
      voided("SEATING_TD", { boardNumber: 1, tableNumber: 1, ns: "A1NS", ew: "A2EW" }),
    ];
    const result = calculateTeamsVpOverall(rows);
    for (const line of result.lines) {
      expect(line.vpByRound[1]).toBe(12);
    }
  });

  it("applies the §3.3.9 split over the expected board count (one side at fault)", () => {
    // Only one room marked void; the scorer reads the cause and inverts if
    // needed. EW at fault on the home row -> home (A1) indemnified.
    const rows: SwissVpBoardRow[] = [
      voided("SHORT_OFFENDER_EW", { boardNumber: 1, tableNumber: 1, ns: "A1NS", ew: "A2EW" }),
      voided("SHORT_OFFENDER_EW", { boardNumber: 1, tableNumber: 2, ns: "A2NS", ew: "A1EW" }),
    ];
    const result = calculateTeamsVpOverall(rows, { expectedBoards: 8 });
    const t1 = result.lines.find((l) => l.teamId === "A1NS")!;
    const t2 = result.lines.find((l) => l.teamId === "A2NS")!;
    expect(t1.vpByRound[1]).toBeGreaterThan(10);
    expect(t2.vpByRound[1]).toBeLessThan(10);
    expect(Math.round((t1.vpByRound[1] + t2.vpByRound[1]) * 100) / 100).toBe(20);
  });

  it("puts both teams below average for a §3.3.9 both-at-fault void", () => {
    const rows: SwissVpBoardRow[] = [
      voided("SHORT_BOTH", { boardNumber: 1, tableNumber: 1, ns: "A1NS", ew: "A2EW" }),
    ];
    const result = calculateTeamsVpOverall(rows, { expectedBoards: 8 });
    for (const line of result.lines) {
      expect(line.vpByRound[1]).toBeLessThan(10);
    }
  });

  it("falls back to the flat 40% for a SHORT void when expectedBoards is unknown", () => {
    const rows: SwissVpBoardRow[] = [
      voided("SHORT_OFFENDER_EW", { boardNumber: 1, tableNumber: 1, ns: "A1NS", ew: "A2EW" }),
    ];
    const result = calculateTeamsVpOverall(rows); // no expectedBoards
    for (const line of result.lines) {
      expect(line.vpByRound[1]).toBe(8);
    }
  });
});

describe("calculateTeamsVpOverall — §3.5 mismatch adjustment", () => {
  // Match {team 1 (home, lower table), team 2}. Team 1 wins the board clearly
  // (3NT+1 vs 3NT=), so it earns > 10 VP. We then declare the match a mismatch
  // and check only the ruled side moves.
  function matchRows(mismatch?: {
    side: "NS" | "EW";
    direction: "HIGHER" | "LOWER";
    fault: "OWN" | "NOT";
  }): SwissVpBoardRow[] {
    const ruling = mismatch
      ? `MM:${mismatch.side}:${mismatch.direction}:${mismatch.fault}`
      : null;
    const status = mismatch ? "MISMATCH" : "CONFIRMED";
    return [
      row({
        tableNumber: 1,
        ns: "A1NS",
        ew: "A2EW",
        confirmedResult: "3NTN+1",
        status,
        matchRuling: ruling,
      }),
      row({
        tableNumber: 2,
        ns: "A2NS",
        ew: "A1EW",
        confirmedResult: "3NTN=",
        status,
        matchRuling: ruling,
      }),
    ];
  }

  it("docks the home team (LOWER + own fault) and leaves the opponent", () => {
    const base = calculateTeamsVpOverall(matchRows());
    const baseHome = base.lines.find((l) => l.teamId === "A1NS")!.vpByRound[1];
    const baseOpp = base.lines.find((l) => l.teamId === "A2NS")!.vpByRound[1];

    // NS = home team (team 1). It played a weaker opponent through its own
    // fault → VP above 5 docked a quarter.
    const ruled = calculateTeamsVpOverall(
      matchRows({ side: "NS", direction: "LOWER", fault: "OWN" }),
    );
    const ruledHome = ruled.lines.find((l) => l.teamId === "A1NS")!.vpByRound[1];
    const ruledOpp = ruled.lines.find((l) => l.teamId === "A2NS")!.vpByRound[1];

    expect(ruledHome).toBeCloseTo(baseHome - (baseHome - 5) / 4, 5);
    expect(ruledHome).toBeLessThan(baseHome);
    // The opponent team is untouched.
    expect(ruledOpp).toBe(baseOpp);
  });

  it("compensates the opponent (EW = opponent, HIGHER + not fault) upward", () => {
    const base = calculateTeamsVpOverall(matchRows());
    const baseOpp = base.lines.find((l) => l.teamId === "A2NS")!.vpByRound[1];

    // EW names the opponent team (team 2, the loser here). HIGHER + not-fault
    // compensates it up to 5 + ¾ × actual.
    const ruled = calculateTeamsVpOverall(
      matchRows({ side: "EW", direction: "HIGHER", fault: "NOT" }),
    );
    const ruledOpp = ruled.lines.find((l) => l.teamId === "A2NS")!.vpByRound[1];

    expect(ruledOpp).toBeCloseTo(5 + 0.75 * baseOpp, 5);
    expect(ruledOpp).toBeGreaterThan(baseOpp);
  });
});
