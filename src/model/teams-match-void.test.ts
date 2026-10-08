import { describe, it, expect } from "vitest";
import {
  buildVoidMatch,
  isVoidMatch,
  parseVoidMatch,
  voidFlatVp,
  voidSplitVp,
  voidMatchVp,
  voidMatchWon,
  VoidCause,
} from "./teams-match-void";

const CAUSES: VoidCause[] = [
  "SEATING_STANDARD",
  "SEATING_TD",
  "SHORT_OFFENDER_NS",
  "SHORT_OFFENDER_EW",
  "SHORT_BOTH",
  "SHORT_NEITHER",
];

describe("void-match token", () => {
  it("round-trips every cause", () => {
    for (const cause of CAUSES) {
      const token = buildVoidMatch(cause);
      expect(isVoidMatch(token)).toBe(true);
      expect(parseVoidMatch(token)).toBe(cause);
    }
  });

  it("rejects non-void outcomes", () => {
    expect(isVoidMatch("3NTN=")).toBe(false);
    expect(isVoidMatch("A60/40")).toBe(false);
    expect(isVoidMatch("TRM:EW_FAULT")).toBe(false);
    expect(parseVoidMatch("VOID:NOPE")).toBeNull();
  });
});

describe("voidFlatVp — §3.3.6.1", () => {
  it("awards both teams 40% of the pool", () => {
    expect(voidFlatVp(20, false)).toEqual({ home: 8, opponent: 8 });
  });

  it("awards both teams the 60% converse when the TD is at fault", () => {
    expect(voidFlatVp(20, true)).toEqual({ home: 12, opponent: 12 });
  });
});

describe("voidSplitVp — §3.3.9", () => {
  // Over N boards the non-offending side gets +3·⌈N/2⌉ IMPs; the offender the
  // mirror. The exact VP comes off the N-board scale, so assert the direction
  // and the complementarity rather than hard-coding the table value.
  it("favours the non-offending side when one side offended", () => {
    const nsOffended = voidSplitVp("SHORT_OFFENDER_NS", 8, 20);
    expect(nsOffended.opponent).toBeGreaterThan(10); // EW indemnified
    expect(nsOffended.home).toBeLessThan(10); // NS offender
    expect(nsOffended.home + nsOffended.opponent).toBe(20);

    const ewOffended = voidSplitVp("SHORT_OFFENDER_EW", 8, 20);
    expect(ewOffended.home).toBeGreaterThan(10);
    expect(ewOffended.opponent).toBeLessThan(10);
  });

  it("puts both teams below average when both are at fault", () => {
    const both = voidSplitVp("SHORT_BOTH", 8, 20);
    expect(both.home).toBeLessThan(10);
    expect(both.opponent).toBeLessThan(10);
    // Symmetric: both penalised equally.
    expect(both.home).toBe(both.opponent);
  });

  it("puts both teams above average when neither is at fault", () => {
    const neither = voidSplitVp("SHORT_NEITHER", 8, 20);
    expect(neither.home).toBeGreaterThan(10);
    expect(neither.opponent).toBeGreaterThan(10);
    expect(neither.home).toBe(neither.opponent);
  });

  it("distinguishes BOTH from NEITHER (the F19 margin limitation is resolved)", () => {
    const both = voidSplitVp("SHORT_BOTH", 8, 20);
    const neither = voidSplitVp("SHORT_NEITHER", 8, 20);
    expect(both.home).not.toBe(neither.home);
  });
});

describe("voidMatchVp — routing", () => {
  it("routes SEATING_STANDARD to the flat 40%", () => {
    expect(voidMatchVp("SEATING_STANDARD", 20, 8)).toEqual({
      home: 8,
      opponent: 8,
    });
  });

  it("routes SEATING_TD to the flat 60% converse", () => {
    expect(voidMatchVp("SEATING_TD", 20, 8)).toEqual({
      home: 12,
      opponent: 12,
    });
  });

  it("routes SHORT_* to the board-count split", () => {
    const split = voidMatchVp("SHORT_OFFENDER_EW", 20, 8);
    expect(split.home).toBeGreaterThan(10);
    expect(split.opponent).toBeLessThan(10);
  });

  it("falls back to the flat 40% for a SHORT cause when the board count is unknown", () => {
    expect(voidMatchVp("SHORT_OFFENDER_EW", 20, undefined)).toEqual({
      home: 8,
      opponent: 8,
    });
  });
});

describe("voidMatchWon — BAM/PAB board-won units", () => {
  it("§3.3.6.1 flat: both teams win 40% of the boards", () => {
    const won = voidMatchWon("SEATING_STANDARD", 8);
    expect(won).toEqual({ home: 3.2, opponent: 3.2, boards: 8 });
  });

  it("§3.3.6.1 TD converse: both teams win 60% of the boards", () => {
    const won = voidMatchWon("SEATING_TD", 8);
    expect(won).toEqual({ home: 4.8, opponent: 4.8, boards: 8 });
  });

  it("§3.3.9 one-side-at-fault: per-board 0.6/0.5 vs 0.4/0.5 split over N", () => {
    // N=8 -> half = ceil(8/2) = 4, rest = 4.
    // EW offended -> home (non-offender) AVE+ on 4 (0.6) + AVE on 4 (0.5) = 4.4;
    // opponent (offender) AVE- on 4 (0.4) + AVE on 4 (0.5) = 3.6.
    const won = voidMatchWon("SHORT_OFFENDER_EW", 8);
    expect(won.home).toBeCloseTo(0.6 * 4 + 0.5 * 4); // 4.4
    expect(won.opponent).toBeCloseTo(0.4 * 4 + 0.5 * 4); // 3.6
    // The two sides' boards-won sum to N (complementary).
    expect(won.home + won.opponent).toBeCloseTo(8);
  });

  it("§3.3.9 odd N rounds the half up (⌈N/2⌉)", () => {
    // N=7 -> half = 4, rest = 3. Non-offender = 0.6*4 + 0.5*3 = 3.9.
    const won = voidMatchWon("SHORT_OFFENDER_NS", 7);
    expect(won.opponent).toBeCloseTo(0.6 * 4 + 0.5 * 3); // non-offender = EW
    expect(won.home).toBeCloseTo(0.4 * 4 + 0.5 * 3); // offender = NS
  });

  it("§3.3.9 both at fault: both below half, equal", () => {
    const won = voidMatchWon("SHORT_BOTH", 8);
    expect(won.home).toBe(won.opponent);
    expect(won.home).toBeLessThan(4); // below the half of 8 boards
  });

  it("§3.3.9 neither at fault: both above half, equal — distinct from BOTH", () => {
    const neither = voidMatchWon("SHORT_NEITHER", 8);
    const both = voidMatchWon("SHORT_BOTH", 8);
    expect(neither.home).toBe(neither.opponent);
    expect(neither.home).toBeGreaterThan(4);
    expect(neither.home).not.toBe(both.home);
  });

  it("falls back to the flat 40% for a SHORT cause when the board count is unknown", () => {
    expect(voidMatchWon("SHORT_OFFENDER_EW", undefined)).toEqual({
      home: 0,
      opponent: 0,
      boards: 0,
    });
  });
});
