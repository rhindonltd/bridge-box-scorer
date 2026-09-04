import { describe, it, expect } from "vitest";

import { mpOverallPlugin } from "./mp";
import { scoreMP } from "@/scoring/traveller/pair/mp";
import { mpBoard1 } from "@/mocks/fixtures/mp-travellers";
import type { ScoredTravellerOfType } from "@/scoring/overall/scored-traveller";
import type { AssignedPair } from "@/model/participants";

function scored(
  board: number,
  traveller: typeof mpBoard1,
): ScoredTravellerOfType<"PAIR_MP"> {
  return { type: "PAIR_MP", board, lines: scoreMP(board, traveller.lines) };
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

describe("mp overall plugin", () => {
  it("has id MP with percentage and matchpoints views", () => {
    expect(mpOverallPlugin.id).toBe("MP");
    expect(mpOverallPlugin.views.map((v) => v.id)).toEqual([
      "percentage",
      "matchpoints",
    ]);
  });

  it("aggregates scored travellers into a leaderboard", () => {
    const leaderboard = mpOverallPlugin.aggregate([scored(1, mpBoard1)]);
    expect(leaderboard.scoring).toBe("MP");
    expect(leaderboard.lines[0]).toHaveProperty("totalMP");
    expect(leaderboard.lines[0]).toHaveProperty("maxMP");
  });

  it("matchpoints view renders Rank/Pair/MP with 'total/max' cells", () => {
    const leaderboard = mpOverallPlugin.aggregate([scored(1, mpBoard1)]);
    const participants = leaderboard.lines.map((l) => pair(l.pairId));
    const view = mpOverallPlugin.views.find((v) => v.id === "matchpoints")!;
    const table = view.toTable(leaderboard, participants);

    expect(table.columns.map((c) => c.label)).toEqual(["Rank", "Pair", "MP"]);
    const mpCell = table.rows[0].cells[2];
    if (mpCell.kind !== "text") throw new Error("expected text cell");
    expect(mpCell.value).toMatch(/^\d+(\.\d+)?\/\d+(\.\d+)?$/);

    leaderboard.lines.forEach((line, i) => {
      const rankCell = table.rows[i].cells[0];
      if (rankCell.kind !== "text") throw new Error("expected text cell");
      expect(rankCell.value).toBe(line.tied ? `${line.rank}=` : `${line.rank}`);
    });
  });

  it("percentage view renders a numeric percentage with 2 decimals", () => {
    const leaderboard = mpOverallPlugin.aggregate([scored(1, mpBoard1)]);
    const participants = leaderboard.lines.map((l) => pair(l.pairId));
    const view = mpOverallPlugin.views.find((v) => v.id === "percentage")!;
    const table = view.toTable(leaderboard, participants);

    const pctCell = table.rows[0].cells[2];
    if (pctCell.kind !== "number") throw new Error("expected number cell");
    expect(pctCell.decimals).toBe(2);

    const line = leaderboard.lines[0];
    const expected = line.maxMP === 0 ? 0 : (line.totalMP / line.maxMP) * 100;
    expect(pctCell.value).toBeCloseTo(expected, 5);
  });

  it("percentage view shows 0 when maxMP is zero", () => {
    // Hand-crafted leaderboard with a zero max (a single-round board where no
    // comparisons exist) to exercise the maxMP === 0 guard.
    const leaderboard = mpOverallPlugin.aggregate([scored(1, mpBoard1)]);
    const zeroed = {
      ...leaderboard,
      lines: [{ ...leaderboard.lines[0], totalMP: 0, maxMP: 0 }],
    };
    const view = mpOverallPlugin.views.find((v) => v.id === "percentage")!;
    const table = view.toTable(zeroed, [pair(zeroed.lines[0].pairId)]);

    const pctCell = table.rows[0].cells[2];
    if (pctCell.kind !== "number") throw new Error("expected number cell");
    expect(pctCell.value).toBe(0);
  });
});
