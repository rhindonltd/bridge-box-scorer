import { describe, it, expect } from "vitest";
import { scoreXIMP } from "./x-imp";
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

describe("scoreXIMP (individual)", () => {
  it("returns empty array for empty input", () => {
    expect(scoreXIMP(1, [])).toEqual([]);
  });

  it("returns nsCrossImps=0 and ewCrossImps=0 for NP", () => {
    const lines = [line("NP")];
    const result = scoreXIMP(1, lines);

    expect(result).toHaveLength(1);
    expect(result[0].score).toBeNull();
    expect(result[0].nsCrossImps).toBe(0);
    expect(result[0].ewCrossImps).toBe(0);
  });

  it("computes 0 nsCrossImps when all results are the same", () => {
    const lines = [
      line("1NTN=", "N1", "S1", "E1", "W1"),
      line("1NTN=", "N2", "S2", "E2", "W2"),
    ];

    const result = scoreXIMP(1, lines);

    for (const r of result) {
      expect(r.nsCrossImps).toBe(0);
      // ewCrossImps = -0 (negative of 0)
      expect(r.ewCrossImps).toBe(-0);
    }
  });

  it("computes cross-IMPs across multiple results", () => {
    // Board 1 (None vul):
    // 1NTN= = 90
    // 3NTN= = 400
    // Cross-IMP for 90: IMP(90-90)=0 + IMP(90-400)=IMP(-310)=-7 -> total = -7
    // Cross-IMP for 400: IMP(400-90)=IMP(310)=7 + IMP(400-400)=0 -> total = 7
    const lines = [
      line("1NTN=", "N1", "S1", "E1", "W1"),
      line("3NTN=", "N2", "S2", "E2", "W2"),
    ];

    const result = scoreXIMP(1, lines);

    const line1 = result.find((r) => r.nId === "N1")!;
    const line2 = result.find((r) => r.nId === "N2")!;

    expect(line1.nsCrossImps).toBe(-7);
    expect(line1.ewCrossImps).toBe(7);

    expect(line2.nsCrossImps).toBe(7);
    expect(line2.ewCrossImps).toBe(-7);
  });

  it("ewCrossImps is the negative of nsCrossImps", () => {
    const lines = [
      line("1NTN=", "N1", "S1", "E1", "W1"),
      line("3NTN=", "N2", "S2", "E2", "W2"),
      line("PO", "N3", "S3", "E3", "W3"),
    ];

    const result = scoreXIMP(1, lines);

    for (const r of result) {
      if (r.score !== null) {
        expect(r.ewCrossImps).toBe(-r.nsCrossImps);
      }
    }
  });
});
