import { describe, it, expect } from "vitest";
import { scoreIMP } from "./imp";
import type { PairLine } from "./common";
import type { BoardOutcome } from "@/model/score";

function line(outcome: string, nsId: string, ewId: string): PairLine {
  return { outcome: outcome as BoardOutcome, nsId, ewId };
}

describe("scoreIMP", () => {
  it("returns 0 IMPs for both sides when score is 0 (passed out)", () => {
    const lines: PairLine[] = [line("PO", "1", "2")];
    const result = scoreIMP(1, lines);
    expect(result[0].nsImps).toBe(0);
    expect(result[0].ewImps).toBe(0);
    expect(result[0].score).toBe(0);
  });

  it("returns 0 IMPs for NP (not played)", () => {
    const lines: PairLine[] = [line("NP", "1", "2")];
    const result = scoreIMP(1, lines);
    expect(result[0].nsImps).toBe(0);
    expect(result[0].ewImps).toBe(0);
    expect(result[0].score).toBeNull();
  });

  it("awards NS IMPs for positive NS score", () => {
    // Board 1, None vul: 3NTN= = 400 -> 9 IMPs
    const lines: PairLine[] = [line("3NTN=", "1", "2")];
    const result = scoreIMP(1, lines);
    expect(result[0].score).toBe(400);
    expect(result[0].nsImps).toBe(9);
    expect(result[0].ewImps).toBe(0);
  });

  it("awards EW IMPs for negative NS score", () => {
    // Board 1, None vul: 3NTE= = -400 -> IMPs(-400) = -9
    // nsImps = max(0, -9) = 0, ewImps = max(0, 9) = 9
    const lines: PairLine[] = [line("3NTE=", "1", "2")];
    const result = scoreIMP(1, lines);
    expect(result[0].score).toBe(-400);
    expect(result[0].nsImps).toBe(0);
    expect(result[0].ewImps).toBe(9);
  });

  it("handles multiple lines independently", () => {
    const lines: PairLine[] = [
      line("3NTN=", "1", "4"), // +400 -> NS 9
      line("4SN-2", "2", "5"), // -100 -> EW 3
      line("PO", "3", "6"), // 0 -> both 0
    ];

    const result = scoreIMP(1, lines);
    expect(result[0].nsImps).toBe(9);
    expect(result[0].ewImps).toBe(0);
    expect(result[1].nsImps).toBe(0);
    expect(result[1].ewImps).toBe(3);
    expect(result[2].nsImps).toBe(0);
    expect(result[2].ewImps).toBe(0);
  });
});
