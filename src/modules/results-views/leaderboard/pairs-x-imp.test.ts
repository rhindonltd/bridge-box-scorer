import { describe, it, expect } from "vitest";

import { ximpOverallPlugin } from "@/modules/scoring/plugins/overall/x-imp";
import { scoreXIMP } from "@/modules/scoring/traveller/pair/x-imp";
import { impBoard1, board2 } from "@/mocks/fixtures/ximp-travellers";
import type { ScoredTravellerOfType } from "@/modules/scoring/overall/scored-traveller";
import type { AssignedPair } from "@/model/participants";

function scored(
  board: number,
  traveller: typeof impBoard1,
): ScoredTravellerOfType<"PAIR_XIMP"> {
  return { type: "PAIR_XIMP", board, lines: scoreXIMP(board, traveller.lines) };
}

function pair(id: string): AssignedPair {
  return {
    type: "PAIR",
    id,
    initialSeat: `${id}NS` as AssignedPair["initialSeat"],
    player1: { id: 1, firstName: "First", lastName: id },
    player2: { id: 2, firstName: "Second", lastName: id },
  } as AssignedPair;
}
import { ximpLeaderboardViews } from "./pairs-x-imp";

describe("ximp overall views", () => {
  it("has a single cross-imps view", () => {
    expect(ximpLeaderboardViews.map((v) => v.id)).toEqual(["cross-imps"]);
  });

  it("view renders Rank/Pair/X-IMP rows, marking ties with '='", () => {
    const leaderboard = ximpOverallPlugin.aggregate([
      scored(1, impBoard1),
      scored(2, board2),
    ]);
    const participants = leaderboard.lines.map((l) => pair(l.pairId));
    const table = ximpLeaderboardViews[0].toTable(leaderboard, participants);

    expect(table.columns.map((c) => c.label)).toEqual([
      "Rank",
      "Pair",
      "X-IMP",
    ]);

    leaderboard.lines.forEach((line, i) => {
      const rankCell = table.rows[i].cells[0];
      if (rankCell.kind !== "text") throw new Error("expected text cell");
      expect(rankCell.value).toBe(line.tied ? `${line.rank}=` : `${line.rank}`);
    });
  });
});
