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

  it("view produces IMP columns sorted by NS cross-imps with 2 decimals", () => {
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

    const nsImp = table.rows.map((r) => {
      const cell = r.cells[4];
      if (cell.kind !== "number") throw new Error("expected number cell");
      expect(cell.decimals).toBe(2);
      return cell.value;
    });
    const sorted = [...nsImp].sort((a, b) => b - a);
    expect(nsImp).toEqual(sorted);

    for (const row of table.rows) {
      expect(row.highlightIds).toHaveLength(2);
    }
  });
});
