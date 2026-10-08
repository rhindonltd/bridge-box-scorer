import { describe, it, expect } from "vitest";
import {
  isAdjustedScore,
  parseAdjustedScore,
  buildAdjustedScore,
  isWeightedScore,
  parseWeightedScore,
  buildWeightedScore,
  isAssignedOutcome,
  WeightedComponent,
} from "./adjusted-score";

describe("isAdjustedScore", () => {
  it("returns true for a well-formed adjusted score", () => {
    expect(isAdjustedScore("A60/40")).toBe(true);
    expect(isAdjustedScore("A100/0")).toBe(true);
    expect(isAdjustedScore("A50/50")).toBe(true);
  });

  it("returns false for non-adjusted outcomes", () => {
    expect(isAdjustedScore("3NTN=")).toBe(false);
    expect(isAdjustedScore("PO")).toBe(false);
    expect(isAdjustedScore("NP")).toBe(false);
    expect(isAdjustedScore("AVE")).toBe(false);
    expect(isAdjustedScore("W80*3NTN=;20*3NTN+1")).toBe(false);
  });
});

describe("parseAdjustedScore", () => {
  it("parses NS and EW percentages from an adjusted score", () => {
    expect(parseAdjustedScore("A60/40")).toEqual({ ns: 60, ew: 40 });
    expect(parseAdjustedScore("A100/0")).toEqual({ ns: 100, ew: 0 });
  });

  it("returns null for a non-adjusted outcome", () => {
    expect(parseAdjustedScore("3NTN=")).toBeNull();
    expect(parseAdjustedScore("AVE")).toBeNull();
  });
});

describe("buildAdjustedScore", () => {
  it("builds the A<ns>/<ew> encoding", () => {
    expect(buildAdjustedScore(60, 40)).toBe("A60/40");
    expect(buildAdjustedScore(50, 50)).toBe("A50/50");
  });

  it("round-trips through parseAdjustedScore", () => {
    const encoded = buildAdjustedScore(60, 40);
    expect(parseAdjustedScore(encoded)).toEqual({ ns: 60, ew: 40 });
  });
});

describe("isWeightedScore", () => {
  it("returns true for a well-formed single-component weighted score", () => {
    expect(isWeightedScore("W100*3NTN=")).toBe(true);
  });

  it("returns true for a multi-component weighted score", () => {
    expect(isWeightedScore("W80*3NTN=;20*3NTN+1")).toBe(true);
  });

  it("returns false when weights do not sum to 100", () => {
    expect(isWeightedScore("W80*3NTN=;10*3NTN+1")).toBe(false);
  });

  it("returns false for a non-weighted string", () => {
    expect(isWeightedScore("3NTN=")).toBe(false);
    expect(isWeightedScore("A60/40")).toBe(false);
    expect(isWeightedScore("PO")).toBe(false);
    expect(isWeightedScore("W")).toBe(false);
    expect(isWeightedScore("")).toBe(false);
  });

  it("returns false when a component is not a valid contract", () => {
    expect(isWeightedScore("W100*INVALID")).toBe(false);
  });

  it("returns false when weight is zero or >100", () => {
    expect(isWeightedScore("W0*3NTN=;100*3NTN+1")).toBe(false);
    expect(isWeightedScore("W101*3NTN=")).toBe(false);
  });
});

describe("parseWeightedScore", () => {
  it("parses a single-component weighted score", () => {
    expect(parseWeightedScore("W100*3NTN=")).toEqual([
      { weight: 100, contract: "3NTN=" },
    ]);
  });

  it("parses a multi-component weighted score", () => {
    expect(parseWeightedScore("W80*3NTN=;20*3NTN+1")).toEqual([
      { weight: 80, contract: "3NTN=" },
      { weight: 20, contract: "3NTN+1" },
    ]);
  });

  it("parses three components", () => {
    expect(parseWeightedScore("W50*3NTN=;30*3NTN+1;20*3NTN-1")).toEqual([
      { weight: 50, contract: "3NTN=" },
      { weight: 30, contract: "3NTN+1" },
      { weight: 20, contract: "3NTN-1" },
    ]);
  });

  it("returns null for non-weighted outcomes", () => {
    expect(parseWeightedScore("3NTN=")).toBeNull();
    expect(parseWeightedScore("A60/40")).toBeNull();
    expect(parseWeightedScore("")).toBeNull();
  });

  it("returns null for weights not summing to 100", () => {
    expect(parseWeightedScore("W50*3NTN=")).toBeNull();
  });
});

describe("buildWeightedScore", () => {
  it("builds the W-encoding for a single component", () => {
    const components: WeightedComponent[] = [
      { weight: 100, contract: "3NTN=" },
    ];
    expect(buildWeightedScore(components)).toBe("W100*3NTN=");
  });

  it("builds the W-encoding for multiple components", () => {
    const components: WeightedComponent[] = [
      { weight: 80, contract: "3NTN=" },
      { weight: 20, contract: "3NTN+1" },
    ];
    expect(buildWeightedScore(components)).toBe("W80*3NTN=;20*3NTN+1");
  });

  it("round-trips through parseWeightedScore", () => {
    const components: WeightedComponent[] = [
      { weight: 60, contract: "4SXN-1" },
      { weight: 40, contract: "4SXN=" },
    ];
    const encoded = buildWeightedScore(components);
    expect(parseWeightedScore(encoded)).toEqual(components);
  });

  it("throws if components are empty", () => {
    expect(() => buildWeightedScore([])).toThrow("at least one component");
  });

  it("throws if weights do not sum to 100", () => {
    expect(() =>
      buildWeightedScore([{ weight: 50, contract: "3NTN=" }]),
    ).toThrow("sum to 100");
  });
});

describe("isAssignedOutcome", () => {
  it("returns true for an adjusted score", () => {
    expect(isAssignedOutcome("A60/40")).toBe(true);
  });

  it("returns true for a weighted score", () => {
    expect(isAssignedOutcome("W100*3NTN=")).toBe(true);
  });

  it("returns false for a played contract", () => {
    expect(isAssignedOutcome("3NTN=")).toBe(false);
  });

  it("returns false for special outcomes", () => {
    expect(isAssignedOutcome("PO")).toBe(false);
    expect(isAssignedOutcome("NP")).toBe(false);
  });
});


