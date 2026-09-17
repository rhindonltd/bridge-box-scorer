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
      expect(isCard("SA")).toBe(true);
      expect(isCard("HT")).toBe(true);
      expect(isCard("C2")).toBe(true);
      expect(isCard("DK")).toBe(true);
    });

    it("returns false for invalid card codes", () => {
      expect(isCard("SX")).toBe(false);
      expect(isCard("S")).toBe(false);
      expect(isCard("")).toBe(false);
      expect(isCard("SAH")).toBe(false);
      expect(isCard("S1")).toBe(false);
      expect(isCard("XA")).toBe(false);
    });

    it("is case sensitive", () => {
      expect(isCard("as")).toBe(false);
      expect(isCard("aS")).toBe(false);
    });
  });

  describe("parseCard", () => {
    it("parses a valid card into rank and suit", () => {
      expect(parseCard("SA")).toEqual({ rank: "A", suit: "S" });
      expect(parseCard("HT")).toEqual({ rank: "T", suit: "H" });
      expect(parseCard("C2")).toEqual({ rank: "2", suit: "C" });
      expect(parseCard("DK")).toEqual({ rank: "K", suit: "D" });
    });

    it("throws for an invalid card code", () => {
      expect(() => parseCard("XY")).toThrow("Invalid card: XY");
      expect(() => parseCard("")).toThrow("Invalid card: ");
      expect(() => parseCard("S1")).toThrow("Invalid card: S1");
    });
  });
});
