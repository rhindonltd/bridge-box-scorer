import { describe, expect, it } from "vitest";
import { SwissVpBoardRow } from "./swiss-vp-overall";
import {
  COMPENSATION_SEGMENT,
  compensationMpFractions,
  compensationSplit,
  compensationXimpPerComparison,
  isHalfMatchRound,
  segmentsForPair,
  ximpHalfVp,
} from "./swiss-half-match";

function row(overrides: Partial<SwissVpBoardRow>): SwissVpBoardRow {
  return {
    section: "A",
    roundNumber: 1,
    tableNumber: 1,
    boardNumber: 1,
    ns: "ANCHOR",
    ew: "X",
    confirmedResult: null,
    directorOverrideResult: null,
    status: "CONFIRMED",
    ...overrides,
  };
}

describe("compensationSplit", () => {
  it("puts AVE+ on the rounded-up half, AVE on the rest", () => {
    expect(compensationSplit(4)).toEqual({ avePlus: 2, ave: 2 });
    expect(compensationSplit(3)).toEqual({ avePlus: 2, ave: 1 });
    expect(compensationSplit(1)).toEqual({ avePlus: 1, ave: 0 });
    expect(compensationSplit(0)).toEqual({ avePlus: 0, ave: 0 });
  });
});

describe("compensationMpFractions", () => {
  it("fronts the AVE+ (0.6) boards, then AVE (0.5)", () => {
    expect(compensationMpFractions(4)).toEqual([0.6, 0.6, 0.5, 0.5]);
    expect(compensationMpFractions(3)).toEqual([0.6, 0.6, 0.5]);
  });
});

describe("compensationXimpPerComparison", () => {
  it("fronts the AVE+ (+2) boards, then AVE (0)", () => {
    expect(compensationXimpPerComparison(4)).toEqual([2, 2, 0, 0]);
    expect(compensationXimpPerComparison(3)).toEqual([2, 2, 0]);
  });
});

describe("ximpHalfVp", () => {
  it("is half the 20-point WBF award over the half's boards (discrete)", () => {
    expect(ximpHalfVp(4, 0, "discrete")).toBe(5); // dead level → 10 VP → 5
    // A positive total is above the neutral half; its negative mirrors it.
    const plus = ximpHalfVp(4, 6, "discrete");
    const minus = ximpHalfVp(4, -6, "discrete");
    expect(plus).toBeGreaterThan(5);
    expect(minus).toBeLessThan(5);
    // Discrete 20-VP halves sum back to 10 (equal-and-opposite integer awards).
    expect(plus + minus).toBe(10);
  });
});

describe("segmentsForPair", () => {
  it("gives the anchor one real segment per opponent, in first-seen order", () => {
    const rows = [
      row({ boardNumber: 1, ns: "ANCHOR", ew: "X" }),
      row({ boardNumber: 2, ns: "ANCHOR", ew: "X" }),
      row({ boardNumber: 3, ns: "ANCHOR", ew: "Y" }),
      row({ boardNumber: 4, ns: "ANCHOR", ew: "Y" }),
    ];

    const segments = segmentsForPair("ANCHOR", rows);

    expect(segments.map((s) => s.opponent)).toEqual(["X", "Y"]);
    expect(segments.every((s) => !s.compensation)).toBe(true);
    expect(segments[0].rows).toHaveLength(2);
    expect(isHalfMatchRound(segments)).toBe(true);
  });

  it("gives a non-anchor one real + one compensation segment", () => {
    const rows = [
      // X plays the first half (sits EW against the anchor)...
      row({ boardNumber: 1, ns: "ANCHOR", ew: "X" }),
      row({ boardNumber: 2, ns: "ANCHOR", ew: "X" }),
      // ...and is compensated for the second half it missed.
      row({ boardNumber: 3, ns: "X", ew: "PHANTOM", status: "HALF_AVERAGE" }),
      row({ boardNumber: 4, ns: "X", ew: "PHANTOM", status: "HALF_AVERAGE" }),
    ];

    const segments = segmentsForPair("X", rows);

    expect(segments).toHaveLength(2);
    // Real segment (opponent ANCHOR) comes before the compensation segment.
    expect(segments[0].opponent).toBe("ANCHOR");
    expect(segments[0].compensation).toBe(false);
    expect(segments[1].opponent).toBe(COMPENSATION_SEGMENT);
    expect(segments[1].compensation).toBe(true);
    expect(isHalfMatchRound(segments)).toBe(true);
  });

  it("gives an ordinary round a single real segment (not a half-match)", () => {
    const rows = [
      row({ boardNumber: 1, ns: "A1NS", ew: "A2EW" }),
      row({ boardNumber: 2, ns: "A1NS", ew: "A2EW" }),
    ];

    const segments = segmentsForPair("A1NS", rows);

    expect(segments).toHaveLength(1);
    expect(segments[0].opponent).toBe("A2EW");
    expect(isHalfMatchRound(segments)).toBe(false);
  });
});
