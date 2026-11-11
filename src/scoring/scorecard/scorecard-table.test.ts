import { describe, it, expect } from "vitest";
import type { PairScorecard, ScorecardBoard } from "@/model/scorecard";
import {
  buildScorecardTable,
  buildScorecardVpTable,
  scorecardViews,
} from "./scorecard-table";

function board(over: Partial<ScorecardBoard> = {}): ScorecardBoard {
  return {
    roundNumber: 1,
    boardNumber: 1,
    side: "NS",
    opponentId: "A2EW",
    outcome: "3NTN=",
    score: 400,
    matchpoints: { value: 6, max: 8 },
    ...over,
  };
}

function mpCard(boards: ScorecardBoard[]): PairScorecard {
  return { pairId: "A1NS", scoring: "MP", boards, roundVps: null };
}

const labels = (t: { columns: { label: string }[] }) =>
  t.columns.map((c) => c.label);

describe("scorecardViews", () => {
  it("offers a % / MP toggle for matchpoints, percentage first", () => {
    expect(scorecardViews(mpCard([])).map((v) => v.id)).toEqual([
      "percentage",
      "matchpoints",
    ]);
  });

  it("offers a single view for IMP and Cross-IMP", () => {
    expect(
      scorecardViews({ ...mpCard([]), scoring: "IMP" }).map((v) => v.label),
    ).toEqual(["IMPs"]);
    expect(
      scorecardViews({ ...mpCard([]), scoring: "XIMP" }).map((v) => v.label),
    ).toEqual(["X-IMPs"]);
  });
});

describe("buildScorecardTable", () => {
  it("shows each board and a total, as a percentage", () => {
    const table = buildScorecardTable(
      mpCard([
        board(),
        board({
          boardNumber: 2,
          score: -100,
          matchpoints: { value: 2, max: 8 },
        }),
      ]),
      "percentage",
    );
    expect(labels(table)).toEqual(["Bd", "Vs", "Contract", "Score", "%"]);
    expect(table.rows).toHaveLength(3);
    expect(table.rows[0].cells).toEqual([
      { kind: "text", value: "1" },
      { kind: "text", value: "A2EW" },
      { kind: "contract", outcome: "3NTN=" },
      { kind: "number", value: 400, decimals: undefined },
      { kind: "number", value: 75, decimals: 2 },
    ]);
    // Total: 8 of 16 = 50%.
    expect(table.rows[2].cells[0]).toEqual({ kind: "text", value: "Total" });
    expect(table.rows[2].cells[4]).toEqual({
      kind: "number",
      value: 50,
      decimals: 2,
    });
  });

  it("shows matchpoints as value/top with a summed total", () => {
    const table = buildScorecardTable(
      mpCard([
        board(),
        board({ boardNumber: 2, matchpoints: { value: 2.5, max: 8 } }),
      ]),
      "matchpoints",
    );
    expect(labels(table).at(-1)).toBe("MP");
    expect(table.rows[0].cells.at(-1)).toEqual({ kind: "text", value: "6/8" });
    expect(table.rows[1].cells.at(-1)).toEqual({
      kind: "text",
      value: "2.5/8",
    });
    expect(table.rows[2].cells.at(-1)).toEqual({
      kind: "text",
      value: "8.5/16",
    });
  });

  it("shows 50% for a board with no top yet", () => {
    const table = buildScorecardTable(
      mpCard([board({ matchpoints: { value: 0, max: 0 } })]),
      "percentage",
    );
    expect(table.rows[0].cells.at(-1)).toEqual({
      kind: "number",
      value: 50,
      decimals: 2,
    });
  });

  it("leaves the score blank for a board with no raw score (not played / adjusted)", () => {
    const table = buildScorecardTable(
      mpCard([board({ outcome: "A60/40", score: null })]),
      "percentage",
    );
    expect(table.rows[0].cells[2]).toEqual({
      kind: "contract",
      outcome: "A60/40",
    });
    expect(table.rows[0].cells[3]).toEqual({ kind: "text", value: "" });
  });

  it("adds a Dir column only when the pair played both directions", () => {
    const mitchell = buildScorecardTable(
      mpCard([board(), board()]),
      "percentage",
    );
    expect(labels(mitchell)).not.toContain("Dir");

    const howell = buildScorecardTable(
      mpCard([board(), board({ boardNumber: 2, side: "EW" })]),
      "percentage",
    );
    expect(labels(howell)).toEqual([
      "Bd",
      "Dir",
      "Vs",
      "Contract",
      "Score",
      "%",
    ]);
    expect(howell.rows[1].cells[1]).toEqual({ kind: "text", value: "EW" });
  });

  it("drops the section from opponents when asked", () => {
    const table = buildScorecardTable(mpCard([board()]), "percentage", {
      hideSection: true,
    });
    expect(table.rows[0].cells[1]).toEqual({ kind: "text", value: "2EW" });
  });

  it("sums IMPs and Cross-IMPs", () => {
    const imp: PairScorecard = {
      ...mpCard([board({ imps: 5 }), board({ boardNumber: 2, imps: -2 })]),
      scoring: "IMP",
    };
    const impTable = buildScorecardTable(imp, "imps");
    expect(labels(impTable).at(-1)).toBe("IMPs");
    expect(impTable.rows.at(-1)!.cells.at(-1)).toEqual({
      kind: "text",
      value: "3",
    });

    const ximp: PairScorecard = {
      ...mpCard([
        board({ crossImps: 1.5 }),
        board({ boardNumber: 2, crossImps: -0.25 }),
      ]),
      scoring: "XIMP",
    };
    expect(
      buildScorecardTable(ximp, "cross-imps").rows.at(-1)!.cells.at(-1),
    ).toEqual({ kind: "number", value: 1.25, decimals: 2 });
  });

  it("has no total row when nothing has been played", () => {
    expect(buildScorecardTable(mpCard([]), "percentage").rows).toEqual([]);
  });
});

describe("buildScorecardVpTable", () => {
  it("is null for a non-Swiss scorecard", () => {
    expect(buildScorecardVpTable(mpCard([board()]))).toBeNull();
  });

  it("lists VP per round with a total", () => {
    const table = buildScorecardVpTable(
      {
        ...mpCard([board()]),
        roundVps: [
          { roundNumber: 1, opponentId: "5", vp: 14.52 },
          { roundNumber: 2, opponentId: null, vp: 10 },
        ],
      },
      { hideSection: true },
    )!;
    expect(labels(table)).toEqual(["Round", "Vs", "VP"]);
    expect(table.rows[0].cells).toEqual([
      { kind: "text", value: "1" },
      { kind: "text", value: "5" },
      { kind: "number", value: 14.52, decimals: 2 },
    ]);
    expect(table.rows[1].cells[1]).toEqual({ kind: "text", value: "" });
    expect(table.rows[2].cells.at(-1)).toEqual({
      kind: "number",
      value: 24.52,
      decimals: 2,
    });
  });
});
