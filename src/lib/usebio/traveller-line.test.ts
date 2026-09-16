import { describe, it, expect } from "vitest";
import { buildTravellerLine, totalTricksFor } from "./traveller-line";
import type { BoardOutcome } from "@/model/score";

describe("totalTricksFor", () => {
  it("counts a made contract as book + level", () => {
    // 3NT= -> 6 + 3 = 9 tricks.
    expect(totalTricksFor("3NTN=" as BoardOutcome)).toBe("9");
  });

  it("adds overtricks", () => {
    // 3NT+1 -> 6 + 3 + 1 = 10.
    expect(totalTricksFor("3NTN+1" as BoardOutcome)).toBe("10");
  });

  it("subtracts undertricks", () => {
    // 4S-1 -> 6 + 4 - 1 = 9.
    expect(totalTricksFor("4SE-1" as BoardOutcome)).toBe("9");
  });

  it("counts a doubled contract the same way (doubling does not change tricks)", () => {
    // 4Sx= -> 6 + 4 = 10.
    expect(totalTricksFor("4SXE=" as BoardOutcome)).toBe("10");
  });

  it("returns empty for a pass-out", () => {
    expect(totalTricksFor("PO" as BoardOutcome)).toBe("");
  });

  it("returns empty for a not-played board", () => {
    expect(totalTricksFor("NP" as BoardOutcome)).toBe("");
  });

  it("returns empty for an adjusted score", () => {
    expect(totalTricksFor("A60/40" as BoardOutcome)).toBe("");
  });
});

describe("buildTravellerLine", () => {
  it("builds a played contract line with contract, declarer, lead, tricks and score", () => {
    // Board 1 is None vul; 3NTN+1 scores 430.
    const line = buildTravellerLine(1, "3NTN+1" as BoardOutcome, "HK");
    expect(line).toEqual({
      contract: "3NT",
      playedBy: "N",
      lead: "HK",
      tricks: "10",
      score: "430",
    });
  });

  it("handles a missing lead as an empty string", () => {
    const line = buildTravellerLine(1, "4SE-1" as BoardOutcome, null);
    expect(line.lead).toBe("");
    expect(line.contract).toBe("4S");
    expect(line.playedBy).toBe("E");
    expect(line.tricks).toBe("9");
  });

  it("emits a pass-out as PASS with a zero score and blank detail", () => {
    const line = buildTravellerLine(1, "PO" as BoardOutcome, null);
    expect(line).toEqual({
      contract: "PASS",
      playedBy: "",
      lead: "",
      tricks: "",
      score: "0",
    });
  });

  it("emits a not-played board with blank fields and zero score", () => {
    const line = buildTravellerLine(1, "NP" as BoardOutcome, null);
    expect(line).toEqual({
      contract: "",
      playedBy: "",
      lead: "",
      tricks: "",
      score: "0",
    });
  });
});
