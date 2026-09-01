import { describe, it, expect } from "vitest";
import { scoreMP } from "./mp";
import type { PairLine } from "./common";
import type { BoardOutcome } from "@/model/score";

function line(outcome: string, nsId: string, ewId: string): PairLine {
  return { outcome: outcome as BoardOutcome, nsId, ewId };
}

describe("scoreMP", () => {
  it("returns empty array when no valid results", () => {
    const lines: PairLine[] = [line("NP", "1", "4"), line("NP", "2", "5")];
    const result = scoreMP(1, lines);
    expect(result).toEqual([]);
  });

  it("awards max matchpoints to highest NS score", () => {
    // Board 1 (None vul): 3NTN= (+400) vs 2NTN= (+120)
    const lines: PairLine[] = [
      line("3NTN=", "1", "4"),
      line("2NTN=", "2", "5"),
    ];

    const result = scoreMP(1, lines);
    expect(result).toHaveLength(2);

    const top = result.find((r) => r.nsId === "1")!;
    const bottom = result.find((r) => r.nsId === "2")!;

    expect(top.nsMatchPoints).toBe(2); // 2*(2-1) = 2 max, top gets 2
    expect(top.ewMatchPoints).toBe(0);
    expect(bottom.nsMatchPoints).toBe(0);
    expect(bottom.ewMatchPoints).toBe(2);
  });

  it("handles tied scores with shared matchpoints", () => {
    // All three pairs make 3NT= on board 1 (None) = 400 each
    const lines: PairLine[] = [
      line("3NTN=", "1", "4"),
      line("3NTN=", "2", "5"),
      line("3NTN=", "3", "6"),
    ];

    const result = scoreMP(1, lines);
    expect(result).toHaveLength(3);

    // With 3 valid results, max = 2*(3-1) = 4
    // All tied at rank average = 1, so ns = 4 - (1 * 4)/(3-1) = 4 - 2 = 2
    for (const r of result) {
      expect(r.maxMatchPoints).toBe(4);
      expect(r.nsMatchPoints).toBe(2);
      expect(r.ewMatchPoints).toBe(2);
    }
  });

  it("scores three different results correctly", () => {
    // Board 1 (None vul):
    // Pair 1: 3NTN+1 = 430
    // Pair 2: 3NTN= = 400
    // Pair 3: 2NTN+1 = 150
    const lines: PairLine[] = [
      line("3NTN+1", "1", "4"),
      line("3NTN=", "2", "5"),
      line("2NTN+1", "3", "6"),
    ];

    const result = scoreMP(1, lines);
    expect(result).toHaveLength(3);

    const pair1 = result.find((r) => r.nsId === "1")!;
    const pair2 = result.find((r) => r.nsId === "2")!;
    const pair3 = result.find((r) => r.nsId === "3")!;

    expect(pair1.nsMatchPoints).toBe(4); // top
    expect(pair2.nsMatchPoints).toBe(2); // middle
    expect(pair3.nsMatchPoints).toBe(0); // bottom

    expect(pair1.ewMatchPoints).toBe(0);
    expect(pair2.ewMatchPoints).toBe(2);
    expect(pair3.ewMatchPoints).toBe(4);
  });

  it("filters out NP lines from scoring", () => {
    const lines: PairLine[] = [
      line("3NTN=", "1", "4"),
      line("NP", "2", "5"),
      line("2NTN=", "3", "6"),
    ];

    const result = scoreMP(1, lines);
    // Only 2 valid results
    expect(result).toHaveLength(2);

    const maxMP = 2 * (2 - 1); // 2
    const top = result.find((r) => r.nsId === "1")!;
    expect(top.nsMatchPoints).toBe(maxMP);
  });
});
