import { describe, it, expect } from "vitest";
import { scoreXIMP } from "./x-imp";
import type { PairLine } from "./common";
import type { BoardOutcome } from "@/model/score";

function line(outcome: string, nsId: string, ewId: string): PairLine {
  return { outcome: outcome as BoardOutcome, nsId, ewId };
}

describe("scoreXIMP", () => {
  it("returns 0 cross-IMPs for NP lines", () => {
    const lines: PairLine[] = [line("NP", "1", "2")];
    const result = scoreXIMP(1, lines);
    expect(result[0].score).toBeNull();
    expect(result[0].nsCrossImps).toBe(0);
    expect(result[0].ewCrossImps).toBe(0);
  });

  it("returns 0 cross-IMPs when only one valid result", () => {
    const lines: PairLine[] = [line("3NTN=", "1", "2")];
    const result = scoreXIMP(1, lines);
    // Cross-IMPs against itself: 400-400 = 0
    expect(result[0].nsCrossImps).toBe(0);
    expect(result[0].ewCrossImps).toBe(-0);
  });

  it("computes cross-IMPs correctly for multiple results", () => {
    // Board 1 (None vul):
    // Line 1: 3NTN= = 400
    // Line 2: 2NTN+1 = 150
    // Line 3: 4SN-1 = -50
    const lines: PairLine[] = [
      line("3NTN=", "1", "4"),
      line("2NTN+1", "2", "5"),
      line("4SN-1", "3", "6"),
    ];

    const result = scoreXIMP(1, lines);

    // Line 1 (400): vs 150 -> 6 IMPs, vs -50 -> 10 IMPs = 16
    const line1 = result.find((r) => r.nsId === "1")!;
    expect(line1.score).toBe(400);
    expect(line1.nsCrossImps).toBeGreaterThan(0);
    expect(line1.ewCrossImps).toBeLessThan(0);

    // Line 3 (-50): vs 400 -> -10, vs 150 -> -5 = -15
    const line3 = result.find((r) => r.nsId === "3")!;
    expect(line3.score).toBe(-50);
    expect(line3.nsCrossImps).toBeLessThan(0);
    expect(line3.ewCrossImps).toBeGreaterThan(0);
  });

  it("ewCrossImps is always the negative of nsCrossImps", () => {
    const lines: PairLine[] = [
      line("3NTN=", "1", "4"),
      line("2NTN=", "2", "5"),
    ];

    const result = scoreXIMP(1, lines);

    for (const r of result) {
      expect(r.ewCrossImps).toBe(-r.nsCrossImps);
    }
  });

  it("filters NP from cross-IMP comparison set", () => {
    const lines: PairLine[] = [
      line("3NTN=", "1", "4"),
      line("NP", "2", "5"),
      line("2NTN=", "3", "6"),
    ];

    const result = scoreXIMP(1, lines);
    const npLine = result.find((r) => r.nsId === "2")!;
    expect(npLine.score).toBeNull();
    expect(npLine.nsCrossImps).toBe(0);
  });
});
