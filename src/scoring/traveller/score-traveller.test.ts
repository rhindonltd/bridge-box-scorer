import { describe, it, expect } from "vitest";
import { score } from "./score-traveller";
import type { Traveller, PairTraveller, IndividualTraveller } from "@/model/traveller";

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

function makeIndividualTraveller(): IndividualTraveller {
  return {
    type: "INDIVIDUAL",
    mode: "INDIVIDUAL",
    board: 1,
    section: "A",
    lines: [
      { outcome: "1NTN=", nId: "N1", sId: "S1", eId: "E1", wId: "W1" },
      { outcome: "3NTN=", nId: "N2", sId: "S2", eId: "E2", wId: "W2" },
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

  describe("INDIVIDUAL mode", () => {
    it("returns INDIVIDUAL_IMP result for IMP mode", () => {
      const result = score(makeIndividualTraveller(), "IMP");
      expect(result.type).toBe("INDIVIDUAL_IMP");
      expect(result.board).toBe(1);
      expect(result.lines).toHaveLength(2);
    });

    it("returns INDIVIDUAL_XIMP result for XIMP mode", () => {
      const result = score(makeIndividualTraveller(), "XIMP");
      expect(result.type).toBe("INDIVIDUAL_XIMP");
      expect(result.board).toBe(1);
      expect(result.lines).toHaveLength(2);
    });

    it("returns INDIVIDUAL_MP result for MP mode", () => {
      const result = score(makeIndividualTraveller(), "MP");
      expect(result.type).toBe("INDIVIDUAL_MP");
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

    it("INDIVIDUAL_MP lines contain nsMatchPoints and ewMatchPoints", () => {
      const result = score(makeIndividualTraveller(), "MP");
      if (result.type === "INDIVIDUAL_MP") {
        for (const line of result.lines) {
          expect(line).toHaveProperty("nsMatchPoints");
          expect(line).toHaveProperty("ewMatchPoints");
        }
      }
    });
  });
});
