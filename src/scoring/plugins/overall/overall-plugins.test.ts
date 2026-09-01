import { describe, it, expect } from "vitest";
import { mpOverallPlugin } from "./mp";
import { ximpOverallPlugin } from "./x-imp";
import { impOverallPlugin } from "./imp";
import { AssignedPair } from "@/model/participants";

const participants: AssignedPair[] = [
  {
    type: "PAIR",
    id: "1",
    initialSeat: "1NS",
    player1: { id: 1, firstName: "Ann", lastName: "Smith", nationalId: null },
    player2: { id: 2, firstName: "Ben", lastName: "Jones", nationalId: null },
  } as any,
];

describe("mp overall plugin", () => {
  it("has id MP with percentage and matchpoints views", () => {
    expect(mpOverallPlugin.id).toBe("MP");
    expect(mpOverallPlugin.views.map((v) => v.id)).toEqual([
      "percentage",
      "matchpoints",
    ]);
  });

  it("matchpoints view renders Rank/Pair/MP with totalMP/maxMP", () => {
    const leaderboard = {
      type: "PAIR_MP",
      mode: "PAIR",
      scoring: "MP",
      lines: [{ pairId: "1", totalMP: 10, maxMP: 20, rank: 1, tied: false }],
    } as any;

    const view = mpOverallPlugin.views.find((v) => v.id === "matchpoints")!;
    const table = view.toTable(leaderboard, participants);

    expect(table.columns.map((c) => c.label)).toEqual(["Rank", "Pair", "MP"]);
    expect(table.rows[0].highlightIds).toEqual(["1"]);
    const mpCell = table.rows[0].cells[2];
    expect(mpCell).toEqual({ kind: "text", value: "10/20" });
    // Pair name rendered as a multiline cell.
    expect(table.rows[0].cells[1].kind).toBe("multiline");
  });

  it("percentage view converts totalMP/maxMP to a 2-decimal percent", () => {
    const leaderboard = {
      type: "PAIR_MP",
      mode: "PAIR",
      scoring: "MP",
      lines: [{ pairId: "1", totalMP: 10, maxMP: 20, rank: 1, tied: false }],
    } as any;

    const view = mpOverallPlugin.views.find((v) => v.id === "percentage")!;
    const table = view.toTable(leaderboard, participants);

    const pctCell = table.rows[0].cells[2];
    expect(pctCell).toEqual({ kind: "number", value: 50, decimals: 2 });
  });

  it("renders a tied rank with a trailing =", () => {
    const leaderboard = {
      type: "PAIR_MP",
      mode: "PAIR",
      scoring: "MP",
      lines: [{ pairId: "1", totalMP: 10, maxMP: 20, rank: 1, tied: true }],
    } as any;
    const view = mpOverallPlugin.views.find((v) => v.id === "matchpoints")!;
    const table = view.toTable(leaderboard, participants);
    expect(table.rows[0].cells[0]).toEqual({ kind: "text", value: "1=" });
  });
});

describe("ximp overall plugin", () => {
  it("has id XIMP with a single X-IMP view rendering Rank/Pair/X-IMP", () => {
    expect(ximpOverallPlugin.id).toBe("XIMP");
    const leaderboard = {
      type: "PAIR_XIMP",
      mode: "PAIR",
      scoring: "XIMP",
      lines: [{ pairId: "1", crossImps: 7, rank: 1, tied: false }],
    } as any;

    const table = ximpOverallPlugin.views[0].toTable(leaderboard, participants);
    expect(table.columns.map((c) => c.label)).toEqual([
      "Rank",
      "Pair",
      "X-IMP",
    ]);
    expect(table.rows[0].cells[2]).toEqual({ kind: "number", value: 7 });
  });
});

describe("imp overall plugin", () => {
  it("has id IMP with a single IMP view rendering Rank/Pair/IMP", () => {
    expect(impOverallPlugin.id).toBe("IMP");
    const leaderboard = {
      type: "PAIR_IMP",
      mode: "PAIR",
      scoring: "IMP",
      lines: [{ pairId: "1", imps: 12, rank: 1, tied: false }],
    } as any;

    const table = impOverallPlugin.views[0].toTable(leaderboard, participants);
    expect(table.columns.map((c) => c.label)).toEqual(["Rank", "Pair", "IMP"]);
    expect(table.rows[0].cells[2]).toEqual({ kind: "number", value: 12 });
  });
});
