import { describe, it, expect } from "vitest";
import { mpPerBoardPlugin } from "./mp";
import { mpBoard1 } from "@/mocks/fixtures/mp-travellers";

describe("mp per-board plugin", () => {
  it("has id MP with percentage and matchpoints views", () => {
    expect(mpPerBoardPlugin.id).toBe("MP");
    expect(mpPerBoardPlugin.views.map((v) => v.id)).toEqual([
      "percentage",
      "matchpoints",
    ]);
  });

  it("scores a board into matchpoint lines", () => {
    const scored = mpPerBoardPlugin.score(mpBoard1);
    expect(scored.length).toBeGreaterThan(0);
    expect(scored[0]).toHaveProperty("nsMatchPoints");
    expect(scored[0]).toHaveProperty("ewMatchPoints");
  });

  it("matchpoints view produces MP columns sorted by NS score descending", () => {
    const scored = mpPerBoardPlugin.score(mpBoard1);
    const view = mpPerBoardPlugin.views.find((v) => v.id === "matchpoints")!;
    const table = view.toTable(scored);

    expect(table.columns.map((c) => c.label)).toEqual([
      "NS",
      "EW",
      "Contract",
      "NS Score",
      "NS MP",
      "EW MP",
    ]);

    // Rows are ordered by NS score descending: the NS Score column (index 3)
    // is non-increasing.
    const nsScore = table.rows.map((r) => {
      const cell = r.cells[3];
      if (cell.kind !== "number") throw new Error("expected number cell");
      return cell.value;
    });
    const sorted = [...nsScore].sort((a, b) => b - a);
    expect(nsScore).toEqual(sorted);

    // Each row carries its NS/EW ids for highlighting.
    for (const row of table.rows) {
      expect(row.highlightIds).toHaveLength(2);
    }
  });

  it("percentage view converts matchpoints to a percentage with 2 decimals", () => {
    const scored = mpPerBoardPlugin.score(mpBoard1);
    const view = mpPerBoardPlugin.views.find((v) => v.id === "percentage")!;
    const table = view.toTable(scored);

    expect(table.columns.map((c) => c.label)).toEqual([
      "NS",
      "EW",
      "Contract",
      "NS Score",
      "NS %",
      "EW %",
    ]);

    const maxMP = 2 * (scored.length - 1);
    // The first displayed row is the highest NS score; its % must match
    // that line's matchpoints / max * 100.
    const topLine = [...scored]
      .filter((l) => l.score !== null)
      .sort((a, b) => b.score! - a.score!)[0];
    const nsPercentCell = table.rows[0].cells[4];
    if (nsPercentCell.kind !== "number") {
      throw new Error("expected number cell");
    }
    expect(nsPercentCell.decimals).toBe(2);
    expect(nsPercentCell.value).toBeCloseTo(
      (topLine.nsMatchPoints / maxMP) * 100,
      5,
    );
  });
});
