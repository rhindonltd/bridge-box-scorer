import { describe, it, expect } from "vitest";
import { scoreMP } from "./mp";
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

describe("scoreMP (individual)", () => {
  it("returns empty array for empty input", () => {
    expect(scoreMP(1, [])).toEqual([]);
  });

  it("returns empty array when all lines are NP (not played)", () => {
    const lines = [line("NP"), line("NP")];
    expect(scoreMP(1, lines)).toEqual([]);
  });

  it("scores a single valid line — returns 0 matchpoints (no comparisons available)", () => {
    const lines = [line("1NTN=")];
    const result = scoreMP(1, lines);

    expect(result).toHaveLength(1);
    expect(result[0].maxMatchPoints).toBe(0);
    expect(result[0].nsMatchPoints).toBe(0);
    expect(result[0].ewMatchPoints).toBe(0);
  });

  it("scores two different results correctly", () => {
    // Board 1: None vulnerable
    // 1NTN= = 90, 2NTN= would be different but let's use 1NTN+1 = 120
    const lines = [
      line("1NTN=", "N1", "S1", "E1", "W1"), // score=90
      line("1NTN+1", "N2", "S2", "E2", "W2"), // score=120
    ];

    const result = scoreMP(1, lines);

    expect(result).toHaveLength(2);
    // max = 2*(2-1) = 2
    // Higher score (120) gets rank 0 -> ns = 2, ew = 0
    // Lower score (90) gets rank 1 -> ns = 0, ew = 2
    const higher = result.find((r) => r.nId === "N2")!;
    const lower = result.find((r) => r.nId === "N1")!;

    expect(higher.maxMatchPoints).toBe(2);
    expect(higher.nsMatchPoints).toBe(2);
    expect(higher.ewMatchPoints).toBe(0);

    expect(lower.maxMatchPoints).toBe(2);
    expect(lower.nsMatchPoints).toBe(0);
    expect(lower.ewMatchPoints).toBe(2);
  });

  it("splits matchpoints for tied scores", () => {
    // Board 1: None vulnerable
    // Three lines with same score
    const lines = [
      line("1NTN=", "N1", "S1", "E1", "W1"),
      line("1NTN=", "N2", "S2", "E2", "W2"),
      line("1NTN=", "N3", "S3", "E3", "W3"),
    ];

    const result = scoreMP(1, lines);

    expect(result).toHaveLength(3);
    // max = 2*(3-1) = 4
    // All tied at rank (0+1+2)/3 = 1
    // ns = 4 - (1 * 4) / (3-1) = 4 - 2 = 2
    // ew = 4 - 2 = 2
    for (const r of result) {
      expect(r.maxMatchPoints).toBe(4);
      expect(r.nsMatchPoints).toBe(2);
      expect(r.ewMatchPoints).toBe(2);
    }
  });

  it("excludes NP lines from scoring but includes valid lines only", () => {
    const lines = [
      line("1NTN=", "N1", "S1", "E1", "W1"),
      line("NP", "N2", "S2", "E2", "W2"),
      line("1NTN+1", "N3", "S3", "E3", "W3"),
    ];

    const result = scoreMP(1, lines);

    // Only 2 valid lines scored
    expect(result).toHaveLength(2);
  });

  it("treats PO (passed out) as score 0", () => {
    // Board 1: None vulnerable
    const lines = [
      line("PO", "N1", "S1", "E1", "W1"), // score = 0
      line("1NTN=", "N2", "S2", "E2", "W2"), // score = 90
    ];

    const result = scoreMP(1, lines);

    expect(result).toHaveLength(2);
    // Higher (90) gets full NS MP, lower (0) gets 0 NS MP
    const higher = result.find((r) => r.nId === "N2")!;
    const lower = result.find((r) => r.nId === "N1")!;

    expect(higher.nsMatchPoints).toBe(2);
    expect(lower.nsMatchPoints).toBe(0);
  });
});
