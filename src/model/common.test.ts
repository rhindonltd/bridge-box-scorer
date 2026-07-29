import { describe, it, expect } from "vitest";
import {
  Directions,
  PairDirections,
  Ranks,
  Suits,
  SuitMap,
  parseCard,
  isCard,
} from "./common";

describe("common model", () => {
  describe("constants", () => {
    it("Directions has 4 compass points", () => {
      expect(Directions).toEqual(["N", "E", "S", "W"]);
    });

    it("PairDirections has NS and EW", () => {
      expect(PairDirections).toEqual(["NS", "EW"]);
    });

    it("Ranks has 13 values from A to 2", () => {
      expect(Ranks).toHaveLength(13);
      expect(Ranks[0]).toBe("A");
      expect(Ranks[12]).toBe("2");
    });

    it("Suits has 4 values", () => {
      expect(Suits).toEqual(["S", "H", "D", "C"]);
    });

    it("SuitMap maps suits to unicode symbols", () => {
      expect(SuitMap).toEqual({
        S: "♠",
        H: "♥",
        D: "♦",
        C: "♣",
      });
    });
  });

  describe("isCard", () => {
    it("returns true for valid card codes", () => {
      expect(isCard("AS")).toBe(true);
      expect(isCard("TH")).toBe(true);
      expect(isCard("2C")).toBe(true);
      expect(isCard("KD")).toBe(true);
    });

    it("returns false for invalid card codes", () => {
      expect(isCard("XS")).toBe(false);
      expect(isCard("A")).toBe(false);
      expect(isCard("")).toBe(false);
      expect(isCard("ASH")).toBe(false);
      expect(isCard("1S")).toBe(false);
      expect(isCard("AX")).toBe(false);
    });

    it("is case sensitive", () => {
      expect(isCard("as")).toBe(false);
      expect(isCard("aS")).toBe(false);
    });
  });

  describe("parseCard", () => {
    it("parses a valid card into rank and suit", () => {
      expect(parseCard("AS")).toEqual({ rank: "A", suit: "S" });
      expect(parseCard("TH")).toEqual({ rank: "T", suit: "H" });
      expect(parseCard("2C")).toEqual({ rank: "2", suit: "C" });
      expect(parseCard("KD")).toEqual({ rank: "K", suit: "D" });
    });

    it("throws for an invalid card code", () => {
      expect(() => parseCard("XY")).toThrow("Invalid card: XY");
      expect(() => parseCard("")).toThrow("Invalid card: ");
      expect(() => parseCard("1S")).toThrow("Invalid card: 1S");
    });
  });
});
