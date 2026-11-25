import { describe, expect, it } from "vitest";
import { impVpWinner, impVpSided } from "./imp-vp-table";

/**
 * Verifies the EBU IMP → VP discrete scale (ported from the EBU vps.js
 * generator) against the published tables:
 *  - the 20-VP full-match table (docs/imp-vp-conversion-table.txt), all 20
 *    listed board counts;
 *  - the 10-VP half-match ("triangular") table (the 3- and 4-board columns from
 *    the supplied screenshot).
 *
 * Each table entry is a band-START: the first winner IMP margin awarding each VP
 * (index 0 = the dead-even band). We assert impVpWinner at the band start and
 * just below it, so every boundary is pinned.
 */

/** Full 20-VP table band-starts (winner VP 10..20) per board count. */
const FULL_STARTS: Record<number, number[]> = {
  5: [0, 1, 3, 5, 7, 10, 13, 16, 20, 25, 31],
  6: [0, 1, 3, 5, 8, 11, 14, 18, 22, 27, 33],
  7: [0, 1, 3, 6, 9, 12, 15, 19, 24, 29, 36],
  8: [0, 1, 4, 7, 10, 13, 17, 21, 26, 31, 39],
  9: [0, 1, 4, 7, 10, 13, 17, 22, 27, 33, 41],
  10: [0, 1, 4, 7, 10, 14, 18, 23, 28, 35, 43],
  11: [0, 2, 5, 8, 11, 15, 19, 24, 30, 37, 45],
  12: [0, 2, 5, 8, 12, 16, 20, 25, 31, 38, 47],
  13: [0, 2, 5, 8, 12, 16, 21, 26, 32, 40, 49],
  14: [0, 2, 5, 9, 13, 17, 22, 27, 34, 41, 51],
  15: [0, 2, 5, 9, 13, 17, 22, 28, 35, 43, 53],
  16: [0, 2, 5, 9, 13, 18, 23, 29, 36, 44, 54],
  20: [0, 2, 6, 10, 15, 20, 26, 32, 40, 49, 61],
  24: [0, 2, 6, 11, 16, 22, 28, 35, 44, 54, 66],
  28: [0, 2, 7, 12, 18, 24, 30, 38, 47, 58, 72],
  32: [0, 3, 8, 13, 19, 25, 33, 41, 51, 62, 77],
  40: [0, 3, 8, 14, 21, 28, 36, 46, 56, 69, 86],
  48: [0, 3, 9, 16, 23, 31, 40, 50, 62, 76, 94],
  56: [0, 3, 10, 17, 25, 33, 43, 54, 67, 82, 101],
  64: [0, 4, 11, 18, 26, 36, 46, 58, 71, 88, 108],
};

/**
 * 10-VP half-match band-starts (winner VP 5..10), keyed by the HALF's board
 * count (the screenshot's "3 boards" / "4 boards" columns).
 */
const HALF_STARTS: Record<number, number[]> = {
  3: [0, 1, 4, 7, 10, 15], // 5-5:0, 6-4:1-3, 7-3:4-6, 8-2:7-9, 9-1:10-14, 10-0:15+
  4: [0, 1, 4, 8, 12, 18], // 5-5:0, 6-4:1-3, 7-3:4-7, 8-2:8-11, 9-1:12-17, 10-0:18+
};

/** Expected winner VP at a margin, from a band-starts array and pool midpoint. */
function expectedVp(starts: number[], mid: number, margin: number): number {
  let vp = mid;
  for (let i = 0; i < starts.length; i++) if (margin >= starts[i]) vp = mid + i;
  return vp;
}

describe("impVpWinner — 20-VP full-match scale", () => {
  for (const boards of Object.keys(FULL_STARTS).map(Number)) {
    it(`matches the published table for ${boards} boards`, () => {
      const starts = FULL_STARTS[boards];
      const top = starts[starts.length - 1] + 3;
      for (let m = 0; m <= top; m++) {
        expect(impVpWinner(m, boards, 20)).toBe(expectedVp(starts, 10, m));
      }
    });
  }
});

describe("impVpWinner — 10-VP half-match scale", () => {
  for (const half of Object.keys(HALF_STARTS).map(Number)) {
    it(`matches the published half table for a ${half}-board half`, () => {
      const starts = HALF_STARTS[half];
      const top = starts[starts.length - 1] + 3;
      for (let m = 0; m <= top; m++) {
        expect(impVpWinner(m, half, 10)).toBe(expectedVp(starts, 5, m));
      }
    });
  }
});

describe("impVpSided — independent per-side scoring", () => {
  it("awards the dead-even midpoint for a zero IMP result", () => {
    expect(impVpSided(0, 8, 20)).toBe(10);
    expect(impVpSided(0, 4, 10)).toBe(5);
  });

  it("mirrors a negative result below the midpoint (pool - winner)", () => {
    // 8 boards, 20-VP: +10 IMP is in the 14-6 band (10-12) → 14; so -10 → 6.
    expect(impVpSided(10, 8, 20)).toBe(14);
    expect(impVpSided(-10, 8, 20)).toBe(6);
  });

  it("caps at the pool and floors at 0", () => {
    expect(impVpSided(1000, 8, 20)).toBe(20);
    expect(impVpSided(-1000, 8, 20)).toBe(0);
    expect(impVpSided(1000, 4, 10)).toBe(10);
    expect(impVpSided(-1000, 4, 10)).toBe(0);
  });

  it("stays an integer across a wide range of inputs", () => {
    for (let m = -60; m <= 60; m++) {
      const v = impVpSided(m, 12, 20);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(20);
    }
  });
});
