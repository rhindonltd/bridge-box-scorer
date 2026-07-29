import { describe, it, expect } from "vitest";
import { scoreIMP } from "./imp";
import type { IndividualLine } from "./common";

function line(
  outcome: string,
  nId = "N1",
  sId = "S1",
  eId = "E1",
  wId = "W1",
): IndividualLine {
  return { outcome: outcome as any, nId, sId, eId, wId };
}

describe("scoreIMP (individual)", () => {
  it("returns empty array for empty input", () => {
    expect(scoreIMP(1, [])).toEqual([]);
  });

  it("returns nsImps=0 and ewImps=0 for NP (not played)", () => {
    const lines = [line("NP")];
    const result = scoreIMP(1, lines);

    expect(result).toHaveLength(1);
    expect(result[0].score).toBeNull();
    expect(result[0].nsImps).toBe(0);
    expect(result[0].ewImps).toBe(0);
  });

  it("computes IMPs for a positive score (NS making contract)", () => {
    // Board 1 (None vul): 1NTN= scores 90
    // IMP for 90 -> between 90-120 -> 3 IMPs
    const lines = [line("1NTN=")];
    const result = scoreIMP(1, lines);

    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(90);
    expect(result[0].nsImps).toBe(3);
    expect(result[0].ewImps).toBe(0);
  });

  it("computes IMPs for a negative score (EW making contract)", () => {
    // Board 1 (None vul): 3NTE= scores -400 from NS perspective
    // IMP for -400 -> |400| is in range 370-420 -> 9 IMPs negative
    // nsImps = max(0, -9) = 0, ewImps = max(0, 9) = 9
    const lines = [line("3NTE=")];
    const result = scoreIMP(1, lines);

    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(-400);
    expect(result[0].nsImps).toBe(0);
    expect(result[0].ewImps).toBe(9);
  });

  it("assigns 0 IMPs for PO (score=0)", () => {
    const lines = [line("PO")];
    const result = scoreIMP(1, lines);

    expect(result).toHaveLength(1);
    expect(result[0].score).toBe(0);
    expect(result[0].nsImps).toBe(0);
    expect(result[0].ewImps).toBe(0);
  });

  it("processes multiple lines independently", () => {
    const lines = [
      line("1NTN=", "N1", "S1", "E1", "W1"), // 90 -> 3 NS
      line("3NTE=", "N2", "S2", "E2", "W2"), // -400 -> 9 EW
    ];

    const result = scoreIMP(1, lines);

    expect(result).toHaveLength(2);
    expect(result[0].nsImps).toBe(3);
    expect(result[0].ewImps).toBe(0);
    expect(result[1].nsImps).toBe(0);
    expect(result[1].ewImps).toBe(9);
  });
});
