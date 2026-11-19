import { describe, it, expect } from "vitest";
import type { OutstandingBoard } from "@/db/games/queries/get-outstanding-boards";
import { boardTitle, pairsLabel } from "./board-labels";
const board = {
  section: "B",
  roundNumber: 2,
  tableNumber: 3,
  boardNumber: 7,
} as OutstandingBoard;
describe("boardTitle", () => {
  it("omits the section for a single-section event", () => {
    expect(boardTitle(board, false, {})).toBe("Round 2 · Table 3 · Board 7");
  });
  it("uses the section label for a multi-section event", () => {
    expect(boardTitle(board, true, { B: "Section B" })).toBe(
      "Round 2 · Section B · Table 3 · Board 7",
    );
  });
  it("falls back to the raw section when it has no label", () => {
    expect(boardTitle(board, true, {})).toBe("Round 2 · B · Table 3 · Board 7");
  });
});
describe("pairsLabel", () => {
  it("joins both pairs", () => {
    expect(pairsLabel("1", "2")).toBe("1 vs 2");
  });
  it("shows a dash for an unseated NS side", () => {
    expect(pairsLabel(null, "2")).toBe("— vs 2");
  });
  it("shows a dash for an unseated EW side", () => {
    expect(pairsLabel("1", null)).toBe("1 vs —");
  });
});
