import { describe, it, expect } from "vitest";

import { impOverallPlugin } from "./imp";
import { scoreIMP } from "@/scoring/traveller/pair/imp";
import { impBoard1, board2 } from "@/mocks/fixtures/ximp-travellers";
import type { ScoredTravellerOfType } from "@/scoring/overall/scored-traveller";
import type { AssignedPair } from "@/model/participants";

function scored(
  board: number,
  traveller: typeof impBoard1,
): ScoredTravellerOfType<"PAIR_IMP"> {
  return { type: "PAIR_IMP", board, lines: scoreIMP(board, traveller.lines) };
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

describe("imp overall plugin", () => {
  it("has id IMP with a single imps view", () => {
    expect(impOverallPlugin.id).toBe("IMP");
    expect(impOverallPlugin.views.map((v) => v.id)).toEqual(["imps"]);
  });

  it("aggregates scored travellers into a leaderboard", () => {
    const leaderboard = impOverallPlugin.aggregate([
      scored(1, impBoard1),
      scored(2, board2),
    ]);
    expect(leaderboard.scoring).toBe("IMP");
    expect(leaderboard.lines.length).toBeGreaterThan(0);
    expect(leaderboard.lines[0]).toHaveProperty("imps");
  });

  it("view renders Rank/Pair/IMP rows, marking ties with '='", () => {
    const leaderboard = impOverallPlugin.aggregate([
      scored(1, impBoard1),
      scored(2, board2),
    ]);
    const participants = leaderboard.lines.map((l) => pair(l.pairId));
    const table = impOverallPlugin.views[0].toTable(leaderboard, participants);

    expect(table.columns.map((c) => c.label)).toEqual(["Rank", "Pair", "IMP"]);
    expect(table.rows).toHaveLength(leaderboard.lines.length);

    // Rank cell reflects the tied flag.
    leaderboard.lines.forEach((line, i) => {
      const rankCell = table.rows[i].cells[0];
      if (rankCell.kind !== "text") throw new Error("expected text cell");
      expect(rankCell.value).toBe(line.tied ? `${line.rank}=` : `${line.rank}`);
    });
  });
});
