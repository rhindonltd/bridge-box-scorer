import { describe, it, expect } from "vitest";
import {
  formatOutcomeForUsebio,
  formatLeadForUsebio,
  isAdjustedScore,
  parseAdjustedScore,
} from "./format-contract";

describe("formatOutcomeForUsebio", () => {
  describe("played contracts", () => {
    it("formats a simple making contract", () => {
      expect(formatOutcomeForUsebio("1NTN=")).toEqual({
        contract: "1 NT",
        declarer: "N",
        result: "=",
      });
    });

    it("formats a contract with overtricks", () => {
      expect(formatOutcomeForUsebio("4SS+2")).toEqual({
        contract: "4 S",
        declarer: "S",
        result: "+2",
      });
    });

    it("formats a contract going down", () => {
      expect(formatOutcomeForUsebio("3HE-1")).toEqual({
        contract: "3 H",
        declarer: "E",
        result: "-1",
      });
    });

    it("formats a doubled contract", () => {
      expect(formatOutcomeForUsebio("2CXW=")).toEqual({
        contract: "2 C x",
        declarer: "W",
        result: "=",
      });
    });

    it("formats a redoubled contract", () => {
      expect(formatOutcomeForUsebio("7NTXXS=")).toEqual({
        contract: "7 NT xx",
        declarer: "S",
        result: "=",
      });
    });

    it("formats a minor suit contract", () => {
      expect(formatOutcomeForUsebio("5DW-2")).toEqual({
        contract: "5 D",
        declarer: "W",
        result: "-2",
      });
    });

    it("formats game-level contracts", () => {
      expect(formatOutcomeForUsebio("3NTN+1")).toEqual({
        contract: "3 NT",
        declarer: "N",
        result: "+1",
      });
    });

    it("formats slam contracts", () => {
      expect(formatOutcomeForUsebio("6HN=")).toEqual({
        contract: "6 H",
        declarer: "N",
        result: "=",
      });
    });

    it("formats grand slam", () => {
      expect(formatOutcomeForUsebio("7SN=")).toEqual({
        contract: "7 S",
        declarer: "N",
        result: "=",
      });
    });
  });

  describe("special outcomes", () => {
    it("formats pass out", () => {
      expect(formatOutcomeForUsebio("PO")).toEqual({
        contract: "PASS",
        declarer: "",
        result: "",
      });
    });

    it("formats not played", () => {
      expect(formatOutcomeForUsebio("NP")).toEqual({
        contract: "",
        declarer: "",
        result: "",
      });
    });

    it("returns empty fields for invalid/unrecognized outcome", () => {
      expect(formatOutcomeForUsebio("INVALID" as any)).toEqual({
        contract: "",
        declarer: "",
        result: "",
      });
    });
  });

  describe("adjusted score outcomes (A<ns>/<ew> format)", () => {
    it("returns empty fields for an adjusted score", () => {
      expect(formatOutcomeForUsebio("A60/40" as any)).toEqual({
        contract: "",
        declarer: "",
        result: "",
      });
    });
  });

  describe("director override outcomes (line 51 branch)", () => {
    it("returns empty fields for AVE (average) outcome", () => {
      expect(formatOutcomeForUsebio("AVE" as any)).toEqual({
        contract: "",
        declarer: "",
        result: "",
      });
    });

    it("returns empty fields for AVE+ outcome", () => {
      expect(formatOutcomeForUsebio("AVE+" as any)).toEqual({
        contract: "",
        declarer: "",
        result: "",
      });
    });

    it("returns empty fields for AVE- outcome", () => {
      expect(formatOutcomeForUsebio("AVE-" as any)).toEqual({
        contract: "",
        declarer: "",
        result: "",
      });
    });
  });
});

describe("isAdjustedScore", () => {
  it("returns true for a well-formed adjusted score", () => {
    expect(isAdjustedScore("A60/40")).toBe(true);
    expect(isAdjustedScore("A100/0")).toBe(true);
  });

  it("returns false for non-adjusted outcomes", () => {
    expect(isAdjustedScore("3NTN=")).toBe(false);
    expect(isAdjustedScore("PO")).toBe(false);
    expect(isAdjustedScore("AVE")).toBe(false);
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

describe("formatLeadForUsebio", () => {
  it("returns the card unchanged (internal format is already Suit+Rank)", () => {
    expect(formatLeadForUsebio("SA")).toBe("SA");
    expect(formatLeadForUsebio("HT")).toBe("HT");
    expect(formatLeadForUsebio("C2")).toBe("C2");
    expect(formatLeadForUsebio("DK")).toBe("DK");
  });

  it("returns empty string for null", () => {
    expect(formatLeadForUsebio(null)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(formatLeadForUsebio("")).toBe("");
  });

  it("returns empty string for a single character (too short)", () => {
    expect(formatLeadForUsebio("S")).toBe("");
  });
});
