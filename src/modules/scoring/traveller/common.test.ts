import { describe, it, expect } from "vitest";
import {
  outcomeToScore,
  prepare,
  computeImps,
  computeCrossImps,
} from "./common";
import type { BoardOutcome } from "@/model/score";

describe("outcomeToScore", () => {
  it("returns 0 for PO (passed out)", () => {
    expect(outcomeToScore(1, "PO")).toBe(0);
  });

  it("returns null for NP (not played)", () => {
    expect(outcomeToScore(1, "NP")).toBeNull();
  });

  it("scores a played contract correctly", () => {
    // Board 1 = None vulnerability. 3NT by N making = 400
    expect(outcomeToScore(1, "3NTN=" as BoardOutcome)).toBe(400);
  });

  it("scores a vulnerable contract correctly", () => {
    // Board 2 = NS vulnerability. 4HN= = 620
    expect(outcomeToScore(2, "4HN=" as BoardOutcome)).toBe(620);
  });

  it("scores a contract going down", () => {
    // Board 1 = None. 4SN-1 = -50
    expect(outcomeToScore(1, "4SN-1" as BoardOutcome)).toBe(-50);
  });

  it("returns null for an outcome that is not a valid played-contract code", () => {
    // Neither PO/NP nor a well-formed contract code (e.g. a corrupt/blank
    // stored result) falls through the isPlayedContractCode guard to null.
    expect(outcomeToScore(1, "GARBAGE" as BoardOutcome)).toBeNull();
    expect(outcomeToScore(1, "" as BoardOutcome)).toBeNull();
  });
});

describe("prepare", () => {
  it("maps lines to scored entries", () => {
    const lines = [
      { outcome: "3NTN=" as BoardOutcome, nsId: "1", ewId: "2" },
      { outcome: "NP" as BoardOutcome, nsId: "3", ewId: "4" },
      { outcome: "PO" as BoardOutcome, nsId: "5", ewId: "6" },
    ];

    const result = prepare(1, lines);

    expect(result).toHaveLength(3);
    expect(result[0].score).toBe(400);
    expect(result[1].score).toBeNull();
    expect(result[2].score).toBe(0);
  });

  it("preserves original line data", () => {
    const lines = [{ outcome: "2SN=" as BoardOutcome, nsId: "1", ewId: "2" }];
    const result = prepare(1, lines);
    expect(result[0].line).toBe(lines[0]);
  });
});

describe("computeImps", () => {
  it("returns positive IMPs for positive score", () => {
    expect(computeImps(400)).toBe(9);
  });

  it("returns negative IMPs for negative score", () => {
    expect(computeImps(-400)).toBe(-9);
  });

  it("returns 0 for zero score", () => {
    expect(computeImps(0)).toBe(0);
  });
});

describe("computeCrossImps", () => {
  it("computes sum of IMPs against all other scores", () => {
    // Score 400 vs [100, 400, -50]
    // 400-100 = 300 -> 7 IMPs
    // 400-400 = 0 -> 0 IMPs
    // 400-(-50) = 450 -> 10 IMPs
    // Total: 17
    const result = computeCrossImps(400, [100, 400, -50]);
    expect(result).toBe(17);
  });

  it("returns 0 when comparing to same score", () => {
    const result = computeCrossImps(400, [400]);
    expect(result).toBe(0);
  });

  it("returns negative total when score is worse than all", () => {
    // -50 vs [400, 420]
    // -50 - 400 = -450 -> -10 IMPs
    // -50 - 420 = -470 -> -10 IMPs
    // Total: -20
    const result = computeCrossImps(-50, [400, 420]);
    expect(result).toBe(-20);
  });
});
