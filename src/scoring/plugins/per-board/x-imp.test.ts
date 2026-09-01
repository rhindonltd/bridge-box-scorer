import { describe, it, expect } from "vitest";
import { ximpPerBoardPlugin } from "./x-imp";
import { impBoard1 } from "@/mocks/fixtures/ximp-travellers";

describe("ximp per-board plugin", () => {
  it("has id XIMP with a single cross-imps view", () => {
    expect(ximpPerBoardPlugin.id).toBe("XIMP");
    expect(ximpPerBoardPlugin.views.map((v) => v.id)).toEqual(["cross-imps"]);
  });

  it("scores a board into cross-imp lines", () => {
    const scored = ximpPerBoardPlugin.score(impBoard1);
    expect(scored[0]).toHaveProperty("nsCrossImps");
    expect(scored[0]).toHaveProperty("ewCrossImps");
  });

  it("view produces IMP columns sorted by NS score with 2-decimal imps", () => {
    const scored = ximpPerBoardPlugin.score(impBoard1);
    const table = ximpPerBoardPlugin.views[0].toTable(scored);

    expect(table.columns.map((c) => c.label)).toEqual([
      "NS",
      "EW",
      "Contract",
      "NS Score",
      "NS IMP",
      "EW IMP",
    ]);

    // Cross-imps are shown to 2 decimals.
    for (const row of table.rows) {
      const impCell = row.cells[4];
      if (impCell.kind !== "number") throw new Error("expected number cell");
      expect(impCell.decimals).toBe(2);
    }

    // Rows are ordered by NS score descending (NS Score column, index 3).
    const nsScore = table.rows.map((r) => {
      const cell = r.cells[3];
      if (cell.kind !== "number") throw new Error("expected number cell");
      return cell.value;
    });
    const sorted = [...nsScore].sort((a, b) => b - a);
    expect(nsScore).toEqual(sorted);

    for (const row of table.rows) {
      expect(row.highlightIds).toHaveLength(2);
    }
  });
});
