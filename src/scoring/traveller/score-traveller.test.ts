import { describe, it, expect } from "vitest";
import { scoreBoard } from "./score-traveller";
import type { PairTraveller } from "@/model/traveller";
import type { ImpScoredLines } from "@/scoring/plugins/per-board/imp";

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

describe("scoreBoard", () => {
  it("resolves the MP per-board plugin for the MP scoring type", () => {
    const result = scoreBoard(makePairTraveller(), "MP");
    expect(result.pluginId).toBe("MP");
    expect(result.board).toBe(1);
    expect(result.lines).toHaveLength(2);
  });

  it("resolves the XIMP per-board plugin for the XIMP scoring type", () => {
    const result = scoreBoard(makePairTraveller(), "XIMP");
    expect(result.pluginId).toBe("XIMP");
    expect(result.board).toBe(1);
    expect(result.lines).toHaveLength(2);
  });

  it("resolves the IMP per-board plugin for the IMP scoring type", () => {
    const result = scoreBoard(makePairTraveller(), "IMP");
    expect(result.pluginId).toBe("IMP");
    expect(result.board).toBe(1);

    const lines = result.lines as ImpScoredLines;
    for (const line of lines) {
      expect(line).toHaveProperty("nsImps");
      expect(line).toHaveProperty("ewImps");
    }
  });
});
