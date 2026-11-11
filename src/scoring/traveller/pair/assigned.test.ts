import { describe, it, expect } from "vitest";
import { scoreMP } from "./mp";
import { scoreIMP } from "./imp";
import { scoreXIMP } from "./x-imp";
import type { PairLine } from "./common";
import type { BoardOutcome } from "@/model/score";
import {
  matchpointsAgainst,
  neuberg,
  artificialImps,
  componentCrossImps,
  weightedComponentScores,
} from "./assigned";

function line(outcome: string, nsId: string, ewId: string): PairLine {
  return { outcome: outcome as BoardOutcome, nsId, ewId };
}

/* ============================================================
   LOW-LEVEL HELPERS
============================================================ */

describe("matchpointsAgainst", () => {
  it("beats all → full doubled matchpoints", () => {
    expect(matchpointsAgainst(500, [400, 300])).toBe(4); // 2 beats × 2
  });

  it("ties all → half matchpoints per tie", () => {
    expect(matchpointsAgainst(400, [400, 400])).toBe(2); // 2 ties × 1
  });

  it("empty field → 0", () => {
    expect(matchpointsAgainst(400, [])).toBe(0);
  });
});

describe("neuberg", () => {
  it("scales a top from a smaller field to exactly the full-field top", () => {
    // A top on a 2-result board (doubled MP 2 of 2), scaled to a 3-result
    // board: single 1 → (1+1)·3/2 − 1 = 2 → doubled 4 = 2·(3−1), the full top.
    expect(neuberg(2, 2, 3)).toBe(4);
  });

  it("scales a bottom to E/A − 1 (never below zero)", () => {
    // Bottom on a 2-result board → (0+1)·3/2 − 1 = 0.5 → doubled 1.
    expect(neuberg(0, 2, 3)).toBe(1);
  });

  it("returns 0 when there are no actual results", () => {
    expect(neuberg(4, 0, 3)).toBe(0);
  });

  it("identity when actual = expected", () => {
    expect(neuberg(4, 3, 3)).toBe(4);
  });
});

describe("artificialImps", () => {
  it("awards +3 for above average", () => {
    expect(artificialImps(60)).toBe(3);
  });

  it("awards -3 for below average", () => {
    expect(artificialImps(40)).toBe(-3);
  });

  it("awards 0 for exactly 50%", () => {
    expect(artificialImps(50)).toBe(0);
  });
});

describe("componentCrossImps", () => {
  it("averages pairwise IMPs against the field", () => {
    // Score 400 vs [150, -50]:
    // 400-150 = 250 → 6 IMPs, 400-(-50) = 450 → 10 IMPs → sum = 16, avg = 8
    expect(componentCrossImps(400, [150, -50])).toBe(8);
  });

  it("returns 0 for empty field", () => {
    expect(componentCrossImps(400, [])).toBe(0);
  });
});

/* ============================================================
   CONVENTION (b) — scoreMP with adjusted/weighted lines
============================================================ */

describe("scoreMP — convention (b)", () => {
  it("an artificial adjusted line counts in the field (max uses total lines)", () => {
    // 2 real lines + 1 adjusted = 3 total lines.
    // max = 2*(3-1) = 4 (NOT 2*(2-1) = 2 as in the old code).
    const lines: PairLine[] = [
      line("3NTN=", "1", "4"), // 400
      line("2NTN=", "2", "5"), // 120
      line("A60/40", "3", "6"), // adjusted 60%
    ];
    const result = scoreMP(1, lines);
    expect(result).toHaveLength(3);

    const max = 4; // 2*(3-1)
    for (const r of result) {
      expect(r.maxMatchPoints).toBe(max);
    }

    // Adjusted line: 60% of 4 = 2.4 NS, 40% of 4 = 1.6 EW
    const adj = result.find((r) => r.nsId === "3")!;
    expect(adj.score).toBeNull();
    expect(adj.nsMatchPoints).toBeCloseTo(2.4);
    expect(adj.ewMatchPoints).toBeCloseTo(1.6);
  });

  it("a weighted score gets the weight-averaged matchpoints", () => {
    // Board 1, None vul:
    // 2 real: 3NTN= (400), 2NTN= (120)
    // 1 weighted: W80*3NTN=;20*3NTN+1 (components: 400, 430)
    //   3 total lines, max = 4
    //   Component 400 vs [400, 120]: beats 120 (2), ties 400 (1) → raw 3 over 2 comparisons.
    //   Neuberg: (3/2 + 1) * 2/2 - 1 = (1.5+1)*1 - 1 = 1.5 → doubled = 3.0
    //   Wait — let me recalculate properly:
    //     single = 3/2 = 1.5; adjusted = (1.5+1)*(2/2) - 1 = 1.5; doubled = 3.0
    //   Component 430 vs [400, 120]: beats both → raw 4 over 2 comparisons.
    //   Neuberg: single = 4/2 = 2.0; adjusted = (2+1)*(2/2) - 1 = 2.0; doubled = 4.0
    //   Weighted: 0.80 * 3.0 + 0.20 * 4.0 = 2.4 + 0.8 = 3.2
    const lines: PairLine[] = [
      line("3NTN=", "1", "4"),
      line("2NTN=", "2", "5"),
      line("W80*3NTN=;20*3NTN+1", "3", "6"),
    ];
    const result = scoreMP(1, lines);
    expect(result).toHaveLength(3);

    const weighted = result.find((r) => r.nsId === "3")!;
    expect(weighted.score).toBeNull();
    expect(weighted.nsMatchPoints).toBeCloseTo(3.2);
    expect(weighted.ewMatchPoints).toBeCloseTo(0.8); // 4 - 3.2
  });

  it("a single-component (N=1) weighted score acts like a result scored against the field", () => {
    // W100*3NTN= (score 400) vs two real lines: 430 and 120.
    // 3 total, max = 4.
    // 400 vs [430, 120]: beats 120 (2), loses to 430 (0) → raw 2 over 2 comparisons.
    // Neuberg: single = 1, adjusted = (1+1)*(2/2) - 1 = 1.0; doubled = 2.0
    const lines: PairLine[] = [
      line("3NTN+1", "1", "4"), // 430
      line("2NTN=", "2", "5"), // 120
      line("W100*3NTN=", "3", "6"), // 400
    ];
    const result = scoreMP(1, lines);
    const weighted = result.find((r) => r.nsId === "3")!;
    expect(weighted.nsMatchPoints).toBeCloseTo(2.0);
    expect(weighted.ewMatchPoints).toBeCloseTo(2.0);
  });

  it("only-adjusted lines: no real field, max still computed, midpoint awarded to weighted", () => {
    // 2 adjusted lines, 0 real lines. Total = 2, max = 2*(2-1) = 2.
    const lines: PairLine[] = [
      line("A60/40", "1", "3"),
      line("A40/60", "2", "4"),
    ];
    const result = scoreMP(1, lines);
    expect(result).toHaveLength(2);
    expect(result[0].maxMatchPoints).toBe(2);
    // 60% of 2 = 1.2
    expect(result[0].nsMatchPoints).toBeCloseTo(1.2);
  });

  it("real lines are Neuberg-scaled over RESULTS, staying within the board top", () => {
    // 2 real + 1 adjusted = 3 results, top 4. Among the reals, 400 beats 120.
    // Neuberg from 2 results to 3: top → 4 (the full top), bottom → 1.
    const lines: PairLine[] = [
      line("3NTN=", "1", "4"), // 400
      line("2NTN=", "2", "5"), // 120
      line("A50/50", "3", "6"),
    ];
    const result = scoreMP(1, lines);
    const top = result.find((r) => r.nsId === "1")!;
    const bottom = result.find((r) => r.nsId === "2")!;
    expect(top.maxMatchPoints).toBe(4);
    expect(top.nsMatchPoints).toBeCloseTo(4);
    expect(top.ewMatchPoints).toBeCloseTo(0);
    expect(bottom.nsMatchPoints).toBeCloseTo(1);
    expect(bottom.ewMatchPoints).toBeCloseTo(3);
  });

  it("never scores a real line outside 0..top, whatever the mix of AVE lines", () => {
    // A withdrawal or late arrival puts an AVE line on a board beside real
    // results. However many reals / AVE lines share the board, no pair may
    // score above the top or below zero on it.
    const reals = ["3NTN+1", "3NTN=", "2NTN=", "1NTN=", "3NTN-1", "3NTN-2"];
    for (let r = 2; r <= reals.length; r++) {
      for (let a = 1; a <= 3; a++) {
        const lines: PairLine[] = [
          ...reals.slice(0, r).map((o, i) => line(o, `n${i}`, `e${i}`)),
          ...Array.from({ length: a }, (_, i) =>
            line("A60/40", `an${i}`, `ae${i}`),
          ),
        ];
        const result = scoreMP(1, lines);
        for (const l of result) {
          expect(l.nsMatchPoints).toBeGreaterThanOrEqual(-1e-9);
          expect(l.ewMatchPoints).toBeGreaterThanOrEqual(-1e-9);
          expect(l.nsMatchPoints).toBeLessThanOrEqual(l.maxMatchPoints + 1e-9);
          expect(l.ewMatchPoints).toBeLessThanOrEqual(l.maxMatchPoints + 1e-9);
        }
      }
    }
  });

  it("a weighted line plus an AVE line: components are scaled from reals+1 results", () => {
    // 2 reals (430, 120) + W100*3NTN= (400) + A60/40 = 4 results, top 6.
    // Component 400 vs [430, 120]: raw 2 on a 3-result field (as one more
    // result) → Neuberg 3 → 4 results: single 1 → (2)·4/3 − 1 = 5/3 → doubled
    // 10/3.
    const lines: PairLine[] = [
      line("3NTN+1", "1", "4"),
      line("2NTN=", "2", "5"),
      line("W100*3NTN=", "3", "6"),
      line("A60/40", "7", "8"),
    ];
    const result = scoreMP(1, lines);
    const weighted = result.find((r) => r.nsId === "3")!;
    expect(weighted.maxMatchPoints).toBe(6);
    expect(weighted.nsMatchPoints).toBeCloseTo(10 / 3);
  });
});

/* ============================================================
   scoreIMP with adjusted/weighted lines
============================================================ */

describe("scoreIMP — assigned scores", () => {
  it("awards ±3 for an artificial adjusted score", () => {
    const lines: PairLine[] = [
      line("3NTN=", "1", "4"),
      line("A60/40", "2", "5"),
    ];
    const result = scoreIMP(1, lines);
    const adj = result.find((r) => r.nsId === "2")!;
    // Each side is awarded independently: 60% → +3, 40% → -3.
    expect(adj.nsImps).toBe(3);
    expect(adj.ewImps).toBe(-3);
  });

  it("an artificial AVE (50/50) gets 0 IMPs", () => {
    const lines: PairLine[] = [line("A50/50", "1", "2")];
    const result = scoreIMP(1, lines);
    expect(result[0].nsImps).toBe(0);
    expect(result[0].ewImps).toBe(0);
  });

  it("awards weighted-average IMPs for a weighted score", () => {
    // Board 1, None vul:
    // W80*3NTN=;20*3NTN+1 → components: 400 (9 IMPs), 430 (10 IMPs)
    // nsImps = 0.80*9 + 0.20*10 = 7.2 + 2.0 = 9.2
    const lines: PairLine[] = [line("W80*3NTN=;20*3NTN+1", "1", "2")];
    const result = scoreIMP(1, lines);
    expect(result[0].nsImps).toBeCloseTo(9.2);
    expect(result[0].ewImps).toBe(0);
  });

  it("real lines are unaffected by assigned lines", () => {
    const lines: PairLine[] = [
      line("3NTN=", "1", "4"), // +400 → 9 IMPs
      line("A60/40", "2", "5"),
    ];
    const result = scoreIMP(1, lines);
    const real = result.find((r) => r.nsId === "1")!;
    expect(real.nsImps).toBe(9);
    expect(real.ewImps).toBe(0);
  });
});

/* ============================================================
   scoreXIMP with adjusted/weighted lines
============================================================ */

describe("scoreXIMP — assigned scores", () => {
  it("awards ±3 for an artificial adjusted score", () => {
    const lines: PairLine[] = [
      line("3NTN=", "1", "4"),
      line("A60/40", "2", "5"),
    ];
    const result = scoreXIMP(1, lines);
    const adj = result.find((r) => r.nsId === "2")!;
    expect(adj.nsCrossImps).toBe(3);
    expect(adj.ewCrossImps).toBe(-3);
  });

  it("real lines compare among real lines only", () => {
    // One real line + one adjusted. Real has no other real to compare against:
    // comparisons = 0 → cross-imps = 0.
    const lines: PairLine[] = [
      line("3NTN=", "1", "4"),
      line("A60/40", "2", "5"),
    ];
    const result = scoreXIMP(1, lines);
    const real = result.find((r) => r.nsId === "1")!;
    expect(real.nsCrossImps).toBe(0);
  });

  it("weighted components are cross-IMPed against the real field", () => {
    // 2 real: 400, 150. 1 weighted: W100*3NTN= (score 400).
    // Component 400 vs [400, 150]: (0 + 6) / 2 = 3.
    const lines: PairLine[] = [
      line("3NTN=", "1", "4"), // 400
      line("2NTN+1", "2", "5"), // 150
      line("W100*3NTN=", "3", "6"),
    ];
    const result = scoreXIMP(1, lines);
    const weighted = result.find((r) => r.nsId === "3")!;
    expect(weighted.nsCrossImps).toBe(3);
    expect(weighted.ewCrossImps).toBe(-3);
  });
});

describe("weightedComponentScores", () => {
  it("returns null for an outcome that is not a well-formed weighted score", () => {
    expect(weightedComponentScores(1, "3NTN=" as BoardOutcome)).toBeNull();
    expect(weightedComponentScores(1, "W50*3NTN=" as BoardOutcome)).toBeNull();
  });
  it("resolves each component to a weight fraction and a score", () => {
    expect(
      weightedComponentScores(1, "W60*3NTN=;40*3NTN+1" as BoardOutcome),
    ).toEqual([
      { weight: 0.6, score: 400 },
      { weight: 0.4, score: 430 },
    ]);
  });
});
