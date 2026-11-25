import { describe, it, expect } from "vitest";

import { mpOverallPlugin } from "./mp";
import { scoreMP } from "@/modules/scoring/traveller/pair/mp";
import { mpBoard1 } from "@/mocks/fixtures/mp-travellers";
import type { ScoredTravellerOfType } from "@/modules/scoring/overall/scored-traveller";

function scored(
  board: number,
  traveller: typeof mpBoard1,
): ScoredTravellerOfType<"PAIR_MP"> {
  return { type: "PAIR_MP", board, lines: scoreMP(board, traveller.lines) };
}

describe("mp overall plugin", () => {
  it("has id MP", () => {
    expect(mpOverallPlugin.id).toBe("MP");
  });

  it("aggregates scored travellers into a leaderboard", () => {
    const leaderboard = mpOverallPlugin.aggregate([scored(1, mpBoard1)]);
    expect(leaderboard.scoring).toBe("MP");
    expect(leaderboard.lines[0]).toHaveProperty("totalMP");
    expect(leaderboard.lines[0]).toHaveProperty("maxMP");
  });
});
