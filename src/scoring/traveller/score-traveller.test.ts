import { describe, it, expect } from "vitest";
import { score } from "./score-traveller";
import type { PairTraveller } from "@/model/traveller";

function makePairTraveller(): PairTraveller {
  return {
    type: "PAIR",
    mode: "PAIR",
    board: 1,
    section: "A",
    lines: [
      { outcome: "1NTN=", nsId: "ns1", ewId: "ew1" },
      { outcome: "3NTN=", nsId: "ns2", ewId: "ew2" },
    ],
  };
}

describe("score-traveller", () => {
  describe("PAIR mode", () => {
    it("returns PAIR_IMP result for IMP mode", () => {
      const result = score(makePairTraveller(), "IMP");
      expect(result.type).toBe("PAIR_IMP");
      expect(result.board).toBe(1);
      expect(result.lines).toHaveLength(2);
    });

    it("returns PAIR_XIMP result for XIMP mode", () => {
      const result = score(makePairTraveller(), "XIMP");
      expect(result.type).toBe("PAIR_XIMP");
      expect(result.board).toBe(1);
      expect(result.lines).toHaveLength(2);
    });

    it("returns PAIR_MP result for MP mode", () => {
      const result = score(makePairTraveller(), "MP");
      expect(result.type).toBe("PAIR_MP");
      expect(result.board).toBe(1);
      expect(result.lines).toHaveLength(2);
    });
  });

  describe("scoring correctness", () => {
    it("PAIR_IMP lines contain nsImps and ewImps", () => {
      const result = score(makePairTraveller(), "IMP");
      if (result.type === "PAIR_IMP") {
        for (const line of result.lines) {
          expect(line).toHaveProperty("nsImps");
          expect(line).toHaveProperty("ewImps");
        }
      }
    });
  });
});
