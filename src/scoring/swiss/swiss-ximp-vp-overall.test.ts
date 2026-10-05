import { describe, it, expect } from "vitest";
import { calculateSwissXimpVpOverall } from "./swiss-ximp-vp-overall";
import { SwissVpBoardRow } from "./swiss-vp-overall";
import { outcomeToScore, computeCrossImps } from "@/scoring/traveller/common";
import { impsToVp } from "./wbf-vp";
import { BoardOutcome } from "@/model/score";

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
    status: "CONFIRMED",
    ...overrides,
  };
}

/**
 * Independently re-derive the expected per-pair round VP for a single board's
 * field of NS-perspective scores, mirroring the scorer's pipeline:
 * XIMPQ = computeCrossImps(score, field) / sqrt(r*c/2); round the total to a
 * whole IMP (halves away from zero); impsToVp(boardsPlayed, total).
 */
function expectedVp(scores: number[], myScore: number): number {
  const r = scores.length;
  const c = r - 1;
  const ximpq = computeCrossImps(myScore, scores) / Math.sqrt((r * c) / 2);
  const rounded = Math.sign(ximpq) * Math.round(Math.abs(ximpq));
  // The scorer emits whole-integer VP (discrete scale), shared with the export.
  return impsToVp(1, rounded, "discrete");
}

describe("calculateSwissXimpVpOverall", () => {
  it("returns empty, well-formed metadata for no rows", () => {
    const result = calculateSwissXimpVpOverall([]);
    expect(result.type).toBe("PAIR_SWISS_VP");
    expect(result.mode).toBe("PAIR");
    expect(result.scoring).toBe("SWISS_VP");
    expect(result.lines).toHaveLength(0);
  });

  it("scores each pair independently against the field (not head-to-head)", () => {
    // Three tables, one board. Distinct NS outcomes so the field has a spread.
    const outcomes: BoardOutcome[] = ["6NTN=", "3NTN=", "3NTN-1"];
    const rows: SwissVpBoardRow[] = [
      row({ tableNumber: 1, ns: "A1NS", ew: "A4EW", confirmedResult: outcomes[0] }),
      row({ tableNumber: 2, ns: "A2NS", ew: "A5EW", confirmedResult: outcomes[1] }),
      row({ tableNumber: 3, ns: "A3NS", ew: "A6EW", confirmedResult: outcomes[2] }),
    ];

    const scores = outcomes.map((o) => outcomeToScore(1, o)!);

    const result = calculateSwissXimpVpOverall(rows);
    const vpOf = (id: string) =>
      result.lines.find((l) => l.pairId === id)!.vpByRound[1];

    // Each NS pair gets the independent VP from its score vs the whole field.
    expect(vpOf("A1NS")).toBe(expectedVp(scores, scores[0]));
    expect(vpOf("A2NS")).toBe(expectedVp(scores, scores[1]));
    expect(vpOf("A3NS")).toBe(expectedVp(scores, scores[2]));
    // Independent scoring: the three NS pairs' VPs do NOT sum to a fixed pool
    // (unlike a head-to-head split), and the field topper beats the field floor.
    expect(vpOf("A1NS")).toBeGreaterThan(vpOf("A3NS"));
  });

  it("mirrors NS and EW of a table (EW gets the negated cross-IMP)", () => {
    const outcomes: BoardOutcome[] = ["6NTN=", "3NTN=", "3NTN-1"];
    const rows: SwissVpBoardRow[] = [
      row({ tableNumber: 1, ns: "A1NS", ew: "A4EW", confirmedResult: outcomes[0] }),
      row({ tableNumber: 2, ns: "A2NS", ew: "A5EW", confirmedResult: outcomes[1] }),
      row({ tableNumber: 3, ns: "A3NS", ew: "A6EW", confirmedResult: outcomes[2] }),
    ];
    const scores = outcomes.map((o) => outcomeToScore(1, o)!);
    const result = calculateSwissXimpVpOverall(rows);
    const vpOf = (id: string) =>
      result.lines.find((l) => l.pairId === id)!.vpByRound[1];

    // Table 1: NS gets +cross-IMP VP, EW gets the mirror (−cross-IMP → VP).
    expect(vpOf("A1NS")).toBe(impsToVp(1, roundOf(scores, scores[0]), "discrete"));
    expect(vpOf("A4EW")).toBe(impsToVp(1, -roundOf(scores, scores[0]), "discrete"));
  });

  it("sums per-round VPs into the session total, ranked highest-first", () => {
    const r1: BoardOutcome[] = ["6NTN=", "3NTN=", "3NTN-1"];
    const rows: SwissVpBoardRow[] = [
      // Round 1
      row({ roundNumber: 1, tableNumber: 1, ns: "A1NS", ew: "A4EW", boardNumber: 1, confirmedResult: r1[0] }),
      row({ roundNumber: 1, tableNumber: 2, ns: "A2NS", ew: "A5EW", boardNumber: 1, confirmedResult: r1[1] }),
      row({ roundNumber: 1, tableNumber: 3, ns: "A3NS", ew: "A6EW", boardNumber: 1, confirmedResult: r1[2] }),
      // Round 2 (new boards): A1NS tops the field again.
      row({ roundNumber: 2, tableNumber: 1, ns: "A1NS", ew: "A5EW", boardNumber: 2, confirmedResult: r1[0] }),
      row({ roundNumber: 2, tableNumber: 2, ns: "A2NS", ew: "A6EW", boardNumber: 2, confirmedResult: r1[1] }),
      row({ roundNumber: 2, tableNumber: 3, ns: "A3NS", ew: "A4EW", boardNumber: 2, confirmedResult: r1[2] }),
    ];

    const result = calculateSwissXimpVpOverall(rows);
    const a1 = result.lines.find((l) => l.pairId === "A1NS")!;
    expect(Object.keys(a1.vpByRound).map(Number).sort()).toEqual([1, 2]);
    expect(a1.totalVP).toBe(
      Math.round((a1.vpByRound[1] + a1.vpByRound[2]) * 100) / 100,
    );
    // Winning the field both rounds, A1NS leads the standings.
    expect(result.lines[0].pairId).toBe("A1NS");
  });

  it("shows a neutral 10 for a drawn round with no results yet", () => {
    const rows: SwissVpBoardRow[] = [
      row({ tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: null }),
      row({ tableNumber: 2, ns: "A3NS", ew: "A4EW", confirmedResult: null }),
    ];
    const result = calculateSwissXimpVpOverall(rows);
    for (const id of ["A1NS", "A2EW", "A3NS", "A4EW"]) {
      expect(result.lines.find((l) => l.pairId === id)!.vpByRound[1]).toBe(10);
    }
  });

  it("shows a neutral 10 when only one table has a result (no comparison)", () => {
    const rows: SwissVpBoardRow[] = [
      row({ tableNumber: 1, ns: "A1NS", ew: "A2EW", confirmedResult: "3NTN=" }),
      row({ tableNumber: 2, ns: "A3NS", ew: "A4EW", confirmedResult: null }),
    ];
    const result = calculateSwissXimpVpOverall(rows);
    // The lone scored table has nothing to compare against yet → neutral 10.
    expect(result.lines.find((l) => l.pairId === "A1NS")!.vpByRound[1]).toBe(10);
  });

  it("ignores sit-out (bye) rows", () => {
    const rows: SwissVpBoardRow[] = [
      row({
        tableNumber: 3,
        ns: "A5NS",
        ew: "PHANTOM",
        status: "SIT_OUT",
        confirmedResult: "3NTN=",
      }),
    ];
    const result = calculateSwissXimpVpOverall(rows);
    expect(result.lines).toHaveLength(0);
  });

  it("uses the director override result over the confirmed result", () => {
    const outcomes: BoardOutcome[] = ["3NTN-1", "3NTN=", "3NTN="];
    const rows: SwissVpBoardRow[] = [
      // A1NS confirmed a poor board but the director overrode it to a top.
      row({
        tableNumber: 1,
        ns: "A1NS",
        ew: "A4EW",
        confirmedResult: "3NTN-3",
        directorOverrideResult: "6NTN=",
      }),
      row({ tableNumber: 2, ns: "A2NS", ew: "A5EW", confirmedResult: outcomes[1] }),
      row({ tableNumber: 3, ns: "A3NS", ew: "A6EW", confirmedResult: outcomes[2] }),
    ];
    const scores = [
      outcomeToScore(1, "6NTN=")!,
      outcomeToScore(1, outcomes[1])!,
      outcomeToScore(1, outcomes[2])!,
    ];
    const result = calculateSwissXimpVpOverall(rows);
    const a1 = result.lines.find((l) => l.pairId === "A1NS")!.vpByRound[1];
    // Scored from the override (a clear top), so A1NS is well above average.
    expect(a1).toBe(impsToVp(1, roundOf(scores, scores[0]), "discrete"));
    expect(a1).toBeGreaterThan(10);
  });
});

/** The rounded whole-IMP XIMPQ total for one score vs the field (test helper). */
function roundOf(scores: number[], myScore: number): number {
  const r = scores.length;
  const c = r - 1;
  const ximpq = computeCrossImps(myScore, scores) / Math.sqrt((r * c) / 2);
  return Math.sign(ximpq) * Math.round(Math.abs(ximpq));
}

// --- "2 half matches" (odd-field) rounds -------------------------------------

describe("calculateSwissXimpVpOverall — 2 half matches round", () => {
  // An 8-board round. Two ordinary tables (T2, T3) play all 8 boards and form
  // the field alongside the anchor table. The half-match group: ANCHOR plays X
  // on boards 1-4 (S1) and Y on boards 5-8 (S2); X is compensated on S2, Y on
  // S1. ANCHOR plays 6NT= (field top) on every board, so X/Y as its EW seat sit
  // at the floor on the boards they play.
  const TOP: BoardOutcome = "6NTN=";
  const MID: BoardOutcome = "3NTN=";
  const LOW: BoardOutcome = "3NTN-1";

  function halfMatchRows(): SwissVpBoardRow[] {
    const rows: SwissVpBoardRow[] = [];
    for (let b = 1; b <= 4; b++) {
      rows.push(row({ tableNumber: 1, boardNumber: b, ns: "ANCHOR", ew: "X", confirmedResult: TOP }));
    }
    for (let b = 5; b <= 8; b++) {
      rows.push(row({ tableNumber: 1, boardNumber: b, ns: "ANCHOR", ew: "Y", confirmedResult: TOP }));
    }
    for (let b = 1; b <= 8; b++) {
      rows.push(row({ tableNumber: 2, boardNumber: b, ns: "A2NS", ew: "A2EW", confirmedResult: MID }));
      rows.push(row({ tableNumber: 3, boardNumber: b, ns: "A3NS", ew: "A3EW", confirmedResult: LOW }));
    }
    // Compensation: X missed S2 (boards 5-8), Y missed S1 (boards 1-4).
    for (let b = 5; b <= 8; b++) {
      rows.push(row({ tableNumber: 1, boardNumber: b, ns: "X", ew: "PHANTOM", status: "HALF_AVERAGE", confirmedResult: null }));
    }
    for (let b = 1; b <= 4; b++) {
      rows.push(row({ tableNumber: 1, boardNumber: b, ns: "Y", ew: "PHANTOM", status: "HALF_AVERAGE", confirmedResult: null }));
    }
    return rows;
  }

  const vpOf = (
    result: ReturnType<typeof calculateSwissXimpVpOverall>,
    id: string,
  ) => result.lines.find((l) => l.pairId === id)!.vpByRound[1];

  // The per-board cross-IMP of X's EW seat (the negated anchor cross-IMP), used
  // to re-derive the real played half independently of the scorer.
  function realFloorHalfVp(): number {
    const field = [outcomeToScore(1, TOP)!, outcomeToScore(1, MID)!, outcomeToScore(1, LOW)!];
    const r = field.length, c = r - 1, norm = Math.sqrt((r * c) / 2);
    const anchorXq = computeCrossImps(field[0], field) / norm;
    const total = 4 * -anchorXq; // X sits EW opposite the anchor on 4 boards
    const rounded = Math.sign(total) * Math.round(Math.abs(total));
    return impsToVp(4, rounded, "discrete") / 2;
  }

  // The compensated half's VP/10: AVE+ (+2/comparison) on 2 of 4 boards, AVE (0)
  // on 2, normalised by the field's sqrt(r*c/2) on each board, over a 3-result
  // field (the comp boards are also played at the two ordinary tables + anchor).
  function compHalfVp(): number {
    const r = 3, c = r - 1, norm = Math.sqrt((r * c) / 2);
    let xq = 0;
    for (let i = 0; i < 4; i++) xq += ((i < 2 ? 2 : 0) * c) / norm;
    const rounded = Math.sign(xq) * Math.round(Math.abs(xq));
    return impsToVp(4, rounded, "discrete") / 2;
  }

  it("credits the anchor its two real halves summed to /20", () => {
    const result = calculateSwissXimpVpOverall(halfMatchRows());
    // The anchor blitzes a 3-result field on every board → 10 + 10.
    expect(vpOf(result, "ANCHOR")).toBe(20);
  });

  it("credits a non-anchor its played half plus the AVE+/AVE compensation", () => {
    const result = calculateSwissXimpVpOverall(halfMatchRows());
    const expected = realFloorHalfVp() + compHalfVp();
    expect(vpOf(result, "X")).toBeCloseTo(expected, 5);
    expect(vpOf(result, "Y")).toBeCloseTo(expected, 5);
  });

  it("still scores an ordinary field table as one full-round segment", () => {
    const result = calculateSwissXimpVpOverall(halfMatchRows());
    // A2 plays all 8 boards as one ordinary segment on the 20-VP scale. Sitting
    // mid-field (second of three on every board) it lands below the anchor but
    // above the floor table A3.
    const a2 = vpOf(result, "A2NS");
    const a3 = vpOf(result, "A3NS");
    expect(a2).toBeGreaterThan(a3);
    expect(a2).toBeLessThan(20);
  });

  it("never emits a line for the phantom opponent of a compensated half", () => {
    // The HALF_AVERAGE rows carry a phantom EW ("PHANTOM"); it is not a real
    // pair and must not be scored as one (which would leak a spurious extra
    // leaderboard line). The field is exactly ANCHOR, X, Y and the two ordinary
    // tables' four pairs — never the phantom.
    const result = calculateSwissXimpVpOverall(halfMatchRows());
    expect(result.lines.some((l) => l.pairId === "PHANTOM")).toBe(false);
    expect(result.lines.map((l) => l.pairId).sort()).toEqual(
      ["A2EW", "A2NS", "A3EW", "A3NS", "ANCHOR", "X", "Y"].sort(),
    );
  });
});
