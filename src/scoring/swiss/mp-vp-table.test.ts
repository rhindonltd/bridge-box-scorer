import { describe, expect, it } from "vitest";
import { mpVpFromPercent } from "./mp-vp-table";

/**
 * Verifies the EBU matchpoint → VP threshold tables (see
 * docs/mp-vp-conversion-tables.txt). The winner side (pct >= 50) reads its VP
 * from the board-count column; a value exactly ON a printed threshold stays in
 * that (lower) band ("not exceeding"); below 50% mirrors to pool - winnerVp.
 */
describe("mpVpFromPercent — 10-VP half-match table", () => {
  // The "4 boards" column: 5-5 ≤51.32, 6-4 ≤54.03, 7-3 ≤57.03, 8-2 ≤60.70,
  // 9-1 ≤66.38, 10-0 >66.38.
  it("reads the winner VP from the 4-board column", () => {
    expect(mpVpFromPercent(51.32, 4, 10)).toBe(5); // exactly on the 5-5 top
    expect(mpVpFromPercent(51.33, 4, 10)).toBe(6); // just over → 6-4
    expect(mpVpFromPercent(54.03, 4, 10)).toBe(6);
    expect(mpVpFromPercent(57.03, 4, 10)).toBe(7);
    expect(mpVpFromPercent(60.7, 4, 10)).toBe(8);
    expect(mpVpFromPercent(66.38, 4, 10)).toBe(9);
    expect(mpVpFromPercent(66.39, 4, 10)).toBe(10); // over the last → 10-0
    expect(mpVpFromPercent(100, 4, 10)).toBe(10);
  });

  it("mirrors a sub-50% percentage to pool - winnerVp", () => {
    // 40% on 4 boards = 10 - vp(60%). 60% ≤60.70 → 8, so 40% → 2.
    expect(mpVpFromPercent(60, 4, 10)).toBe(8);
    expect(mpVpFromPercent(40, 4, 10)).toBe(2);
    // The complement of an exact winner threshold: 57.03 → 7, so 42.97 → 3.
    expect(mpVpFromPercent(42.97, 4, 10)).toBe(3);
  });

  it("treats exactly 50% as the dead-even split (5-5)", () => {
    expect(mpVpFromPercent(50, 2, 10)).toBe(5);
    expect(mpVpFromPercent(50, 13, 10)).toBe(5);
  });

  it("uses the right column per board-count band", () => {
    // 2-or-fewer column: 5-5 ≤51.86.
    expect(mpVpFromPercent(51.86, 1, 10)).toBe(5);
    expect(mpVpFromPercent(51.86, 2, 10)).toBe(5);
    // 3-board column: 5-5 ≤51.59, so 51.86 is over → 6-4.
    expect(mpVpFromPercent(51.86, 3, 10)).toBe(6);
    // 5-6 column: 9-1 ≤63.66.
    expect(mpVpFromPercent(63.66, 5, 10)).toBe(9);
    expect(mpVpFromPercent(63.66, 6, 10)).toBe(9);
    // 7-9 column: 9-1 ≤61.41.
    expect(mpVpFromPercent(61.41, 7, 10)).toBe(9);
    expect(mpVpFromPercent(61.41, 9, 10)).toBe(9);
    // 10-13 column: 10-0 >59.56.
    expect(mpVpFromPercent(59.56, 10, 10)).toBe(9);
    expect(mpVpFromPercent(59.57, 13, 10)).toBe(10);
  });

  it("clamps a board count beyond the last column to that column", () => {
    // 14 boards is beyond the half table's 10-13; clamp to 10-13 (10-0 >59.56).
    expect(mpVpFromPercent(59.56, 14, 10)).toBe(9);
    expect(mpVpFromPercent(59.57, 14, 10)).toBe(10);
  });
});

describe("mpVpFromPercent — 20-VP full-match table", () => {
  // The "7-9 boards" column: 10-10 ≤50.65 ... 19-1 ≤68.35, 20-0 >68.35.
  it("reads the winner VP from the 7-9 board column", () => {
    expect(mpVpFromPercent(50.65, 8, 20)).toBe(10);
    expect(mpVpFromPercent(50.66, 8, 20)).toBe(11);
    expect(mpVpFromPercent(51.98, 8, 20)).toBe(11);
    expect(mpVpFromPercent(53.33, 8, 20)).toBe(12);
    expect(mpVpFromPercent(68.35, 8, 20)).toBe(19);
    expect(mpVpFromPercent(68.36, 8, 20)).toBe(20);
  });

  it("mirrors a sub-50% percentage (40% = 20 - vp(60%))", () => {
    // ≤4 column: 60% is ≤61.08 (15-5) and >58.80 (14-6) → 15. So 40% → 5.
    expect(mpVpFromPercent(60, 4, 20)).toBe(15);
    expect(mpVpFromPercent(40, 4, 20)).toBe(5);
  });

  it("treats exactly 50% as the dead-even split (10-10)", () => {
    expect(mpVpFromPercent(50, 4, 20)).toBe(10);
    expect(mpVpFromPercent(50, 27, 20)).toBe(10);
  });

  it("uses the right column per board-count band (incl. the 20-27 cap)", () => {
    // ≤4 column: 10-10 ≤50.92.
    expect(mpVpFromPercent(50.92, 4, 20)).toBe(10);
    // 5-6 column: 10-10 ≤50.78, so 50.92 is over → 11-9.
    expect(mpVpFromPercent(50.92, 5, 20)).toBe(11);
    // 20-27 column: 10-10 ≤50.38, 20-0 >60.71.
    expect(mpVpFromPercent(50.38, 20, 20)).toBe(10);
    expect(mpVpFromPercent(60.71, 27, 20)).toBe(19);
    expect(mpVpFromPercent(60.72, 27, 20)).toBe(20);
  });

  it("clamps beyond 20-27 boards to the last column", () => {
    expect(mpVpFromPercent(60.71, 40, 20)).toBe(19);
    expect(mpVpFromPercent(60.72, 40, 20)).toBe(20);
  });
});

describe("mpVpFromPercent — validation", () => {
  it("rejects out-of-range percentages", () => {
    expect(() => mpVpFromPercent(-1, 4, 10)).toThrow();
    expect(() => mpVpFromPercent(101, 4, 20)).toThrow();
  });

  it("always returns a whole integer in [0, pool]", () => {
    for (let pct = 0; pct <= 100; pct += 0.5) {
      const half = mpVpFromPercent(pct, 4, 10);
      const full = mpVpFromPercent(pct, 8, 20);
      expect(Number.isInteger(half)).toBe(true);
      expect(Number.isInteger(full)).toBe(true);
      expect(half).toBeGreaterThanOrEqual(0);
      expect(half).toBeLessThanOrEqual(10);
      expect(full).toBeGreaterThanOrEqual(0);
      expect(full).toBeLessThanOrEqual(20);
    }
  });
});
