import { describe, it, expect } from "vitest";

import { ximpOverallPlugin } from "./x-imp";
import { scoreXIMP } from "@/modules/scoring/traveller/pair/x-imp";
import { impBoard1, board2 } from "@/mocks/fixtures/ximp-travellers";
import type { ScoredTravellerOfType } from "@/modules/scoring/overall/scored-traveller";

function scored(
  board: number,
  traveller: typeof impBoard1,
): ScoredTravellerOfType<"PAIR_XIMP"> {
  return { type: "PAIR_XIMP", board, lines: scoreXIMP(board, traveller.lines) };
}

describe("ximp overall plugin", () => {
  it("has id XIMP", () => {
    expect(ximpOverallPlugin.id).toBe("XIMP");
  });

  it("aggregates scored travellers into a leaderboard", () => {
    const leaderboard = ximpOverallPlugin.aggregate([
      scored(1, impBoard1),
      scored(2, board2),
    ]);
    expect(leaderboard.scoring).toBe("XIMP");
    expect(leaderboard.lines[0]).toHaveProperty("crossImps");
  });
});
