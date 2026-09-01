import { describe, it, expect } from "vitest";
import { impPerBoardPlugin } from "./imp";
import { mpBoard1 } from "@/mocks/fixtures/mp-travellers";

describe("imp per-board plugin", () => {
  it("has id IMP with a single imps view", () => {
    expect(impPerBoardPlugin.id).toBe("IMP");
    expect(impPerBoardPlugin.views.map((v) => v.id)).toEqual(["imps"]);
  });

  it("scores a board into imp lines", () => {
    const scored = impPerBoardPlugin.score(mpBoard1);
    expect(scored[0]).toHaveProperty("nsImps");
    expect(scored[0]).toHaveProperty("ewImps");
  });

  it("view produces IMP columns sorted by NS score descending", () => {
    const scored = impPerBoardPlugin.score(mpBoard1);
    const table = impPerBoardPlugin.views[0].toTable(scored);

    expect(table.columns.map((c) => c.label)).toEqual([
      "NS",
      "EW",
      "Contract",
      "NS Score",
      "NS IMP",
      "EW IMP",
    ]);

    // Per-board IMP is a whole-number IMP value (no decimals), which
    // distinguishes it from the XIMP view's 2-decimal cross-imps.
    for (const row of table.rows) {
      const impCell = row.cells[4];
      if (impCell.kind !== "number") throw new Error("expected number cell");
      expect(impCell.decimals).toBeUndefined();
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
