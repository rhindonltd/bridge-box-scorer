import { describe, it, expect } from "vitest";
import { mpPerBoardPlugin } from "./mp";
import { mpBoard1 } from "@/mocks/fixtures/mp-travellers";
import type { PairTraveller } from "@/model/traveller";

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

  it("labels pairs by table number, dropping the direction, honouring includeSection", () => {
    // Section-qualified ids so the section/direction handling is exercised.
    const traveller = {
      type: "PAIR",
      mode: "PAIR",
      board: 1,
      section: "A",
      lines: [
        { nsId: "A1NS", ewId: "A2EW", outcome: "3NTN=" },
        { nsId: "A3NS", ewId: "A4EW", outcome: "3NTN+1" },
      ],
    } as PairTraveller;
    const scored = mpPerBoardPlugin.score(traveller);
    const view = mpPerBoardPlugin.views.find((v) => v.id === "matchpoints")!;

    // Rows are ordered by NS score descending, so A3 (3NTN+1) precedes A1.
    // Single-section: just the table number (NS/EW column shows the direction).
    const single = view.toTable(scored, { includeSection: false });
    const singleNs = single.rows.map((r) => r.cells[0]);
    const singleEw = single.rows.map((r) => r.cells[1]);
    expect(singleNs.map((c) => (c.kind === "text" ? c.value : null))).toEqual([
      "3",
      "1",
    ]);
    expect(singleEw.map((c) => (c.kind === "text" ? c.value : null))).toEqual([
      "4",
      "2",
    ]);

    // Multi-section: keep the section prefix so pairs stay distinguishable.
    const multi = view.toTable(scored, { includeSection: true });
    const multiNs = multi.rows.map((r) => r.cells[0]);
    expect(multiNs.map((c) => (c.kind === "text" ? c.value : null))).toEqual([
      "A3",
      "A1",
    ]);

    // The highlight ids keep the full seat id regardless of the display label.
    expect(multi.rows[1].highlightIds).toEqual(["A1NS", "A2EW"]);
  });

  it("percentage view shows 50% for a single result (no field to compare, maxMP = 0)", () => {
    // One line means maxMP = 2 * (1 - 1) = 0: there is no field to measure
    // against, so matchpointing convention gives each side the average, 50%,
    // rather than a misleading 0% from a zero top.
    const single = {
      type: "PAIR",
      mode: "PAIR",
      board: 1,
      section: "A",
      lines: [{ nsId: "1", ewId: "2", outcome: "3NTN=" }],
    } as PairTraveller;

    const scored = mpPerBoardPlugin.score(single);
    const view = mpPerBoardPlugin.views.find((v) => v.id === "percentage")!;
    const table = view.toTable(scored);

    const nsPercentCell = table.rows[0].cells[4];
    const ewPercentCell = table.rows[0].cells[5];
    if (nsPercentCell.kind !== "number" || ewPercentCell.kind !== "number") {
      throw new Error("expected number cells");
    }
    expect(nsPercentCell.value).toBe(50);
    expect(ewPercentCell.value).toBe(50);
  });

  it("percentage view shows 50% for a single passed-out board", () => {
    // A passout (PO) scores 0, but with only one result there is still no field
    // to compare against — both sides get the 50% average, not 0%.
    const single = {
      type: "PAIR",
      mode: "PAIR",
      board: 1,
      section: "A",
      lines: [{ nsId: "1", ewId: "2", outcome: "PO" }],
    } as PairTraveller;

    const scored = mpPerBoardPlugin.score(single);
    const view = mpPerBoardPlugin.views.find((v) => v.id === "percentage")!;
    const table = view.toTable(scored);

    const nsPercentCell = table.rows[0].cells[4];
    const ewPercentCell = table.rows[0].cells[5];
    if (nsPercentCell.kind !== "number" || ewPercentCell.kind !== "number") {
      throw new Error("expected number cells");
    }
    expect(nsPercentCell.value).toBe(50);
    expect(ewPercentCell.value).toBe(50);
  });
});
