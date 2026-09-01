import { describe, it, expect } from "vitest";
import {
  contractCell,
  formatNumberCell,
  numberCell,
  textCell,
} from "./score-table";

describe("score-table cell helpers", () => {
  it("builds a text cell", () => {
    expect(textCell("hello")).toEqual({ kind: "text", value: "hello" });
  });

  it("builds a number cell with and without decimals", () => {
    expect(numberCell(5)).toEqual({ kind: "number", value: 5 });
    expect(numberCell(5.5, 2)).toEqual({
      kind: "number",
      value: 5.5,
      decimals: 2,
    });
  });

  it("builds a contract cell", () => {
    expect(contractCell("3NTN=")).toEqual({
      kind: "contract",
      outcome: "3NTN=",
    });
  });

  describe("formatNumberCell", () => {
    it("renders an integer without decimals when none specified", () => {
      expect(formatNumberCell({ value: 400 })).toBe("400");
    });

    it("renders with fixed decimals when specified", () => {
      expect(formatNumberCell({ value: 5.5, decimals: 2 })).toBe("5.50");
      expect(formatNumberCell({ value: -5, decimals: 2 })).toBe("-5.00");
    });

    it("renders zero decimals explicitly", () => {
      expect(formatNumberCell({ value: 3.7, decimals: 0 })).toBe("4");
    });
  });
});
