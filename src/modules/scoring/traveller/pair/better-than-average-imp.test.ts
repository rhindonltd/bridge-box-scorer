import { describe, it, expect } from "vitest";
import {
  applyBetterThanAverageXimpBoards,
  type ScoredImpBoard,
} from "./better-than-average-imp";
import { scoreXIMP, type XimpLine } from "./x-imp";
import type { PairLine } from "./common";
import type { BoardOutcome } from "@/model/score";

function line(outcome: string, nsId: string, ewId: string): PairLine {
  return { outcome: outcome as BoardOutcome, nsId, ewId };
}

function ximpBoard(
  boardNo: number,
  lines: PairLine[],
): ScoredImpBoard<XimpLine> {
  return { board: boardNo, lines: scoreXIMP(boardNo, lines) };
}

function nsXimp(
  boards: ScoredImpBoard<XimpLine>[],
  boardNo: number,
  nsId: string,
): number {
  const b = boards.find((x) => x.board === boardNo)!;
  return b.lines.find((l) => l.nsId === nsId)!.nsCrossImps;
}
function ewXimp(
  boards: ScoredImpBoard<XimpLine>[],
  boardNo: number,
  ewId: string,
): number {
  const b = boards.find((x) => x.board === boardNo)!;
  return b.lines.find((l) => l.ewId === ewId)!.ewCrossImps;
}

describe("applyBetterThanAverageXimpBoards (Cross-IMP)", () => {
  it("leaves a board with no artificial lines unchanged", () => {
    const boards = [
      ximpBoard(1, [line("3NTN=", "1", "4"), line("2NTN=", "2", "5")]),
    ];
    expect(applyBetterThanAverageXimpBoards(boards)).toEqual(boards);
  });

  it("uplifts AVE+ to the pair's actual average cross-IMP when it exceeds +3", () => {
    // Pair "1" (NS) beats a weak field by a big margin on its real board, so
    // its cross-IMP clears +3; AVE+ on the last board gives that average.
    const field: PairLine[] = [
      line("6NTN=", "1", "4"), // top
      line("1NTN=", "2", "5"), // low
      line("1NTN=", "3", "6"), // low
    ];
    const realAvg = nsXimp([ximpBoard(1, field)], 1, "1");
    expect(realAvg).toBeGreaterThan(3); // sanity

    const boards = [
      ximpBoard(1, field),
      ximpBoard(1, field), // same board number → identical result
      ximpBoard(2, [
        line("A60/40", "1", "4"),
        line("1NTN=", "2", "5"),
        line("1NTN=", "3", "6"),
      ]),
    ];
    const out = applyBetterThanAverageXimpBoards(boards);
    expect(nsXimp(out, 2, "1")).toBeCloseTo(realAvg);
  });

  it("downlifts AVE- to the pair's actual average cross-IMP when below -3", () => {
    // EW "4" is on the losing side of the big board, so its cross-IMP is well
    // below -3 (cross-IMP is signed). AVE- gives that.
    const field: PairLine[] = [
      line("6NTN=", "1", "4"), // EW "4" very negative
      line("1NTN=", "2", "5"),
      line("1NTN=", "3", "6"),
    ];
    const ewReal = ewXimp([ximpBoard(1, field)], 1, "4");
    expect(ewReal).toBeLessThan(-3); // sanity

    const boards = [
      ximpBoard(1, field),
      ximpBoard(1, field),
      ximpBoard(2, [
        line("A60/40", "7", "4"), // NS=60 (AVE+), EW "4"=40 (AVE-)
        line("1NTN=", "8", "5"),
        line("1NTN=", "9", "6"),
      ]),
    ];
    const out = applyBetterThanAverageXimpBoards(boards);
    expect(ewXimp(out, 2, "4")).toBeCloseTo(ewReal);
  });

  it("keeps the flat +3 for AVE+ when the pair's cross-IMP average is below +3", () => {
    const field: PairLine[] = [
      line("1NTN=", "1", "4"),
      line("1NTN=", "2", "5"),
      line("1NTN=", "3", "6"),
    ];
    const boards = [
      ximpBoard(1, field), // everyone equal → 0 cross-IMP
      ximpBoard(2, [
        line("A60/40", "1", "4"),
        line("1NTN=", "2", "5"),
        line("1NTN=", "3", "6"),
      ]),
    ];
    const out = applyBetterThanAverageXimpBoards(boards);
    expect(nsXimp(out, 2, "1")).toBe(3); // flat +3
  });

  it("keeps the flat value when the pair has no real boards in the window", () => {
    const boards = [ximpBoard(1, [line("A60/40", "1", "4")])];
    const out = applyBetterThanAverageXimpBoards(boards);
    expect(nsXimp(out, 1, "1")).toBe(3); // flat +3, no real boards
  });

  it("leaves a non-AVE+/AVE- custom adjusted score untouched", () => {
    // A50/50 is AVE (0 IMPs each side), not an exact +3/-3, so no uplift —
    // even though the pair tops its real board.
    const boards = [
      ximpBoard(1, [line("6NTN=", "1", "4"), line("1NTN=", "2", "5")]),
      ximpBoard(2, [line("A50/50", "1", "4")]),
    ];
    const out = applyBetterThanAverageXimpBoards(boards);
    expect(nsXimp(out, 2, "1")).toBe(0); // AVE stays 0, not uplifted
  });
});

describe("applyBetterThanAverageXimpBoards — edge cases", () => {
  const field = [line("3NTN=", "2", "5"), line("2NTN=", "3", "6")];

  it("overrides only the AVE+ side when the other side is neither +3 nor -3", () => {
    const boards = [ximpBoard(1, [line("A60/50", "1", "4"), ...field])];
    const out = applyBetterThanAverageXimpBoards(boards);
    const before = boards[0].lines.find((l) => l.nsId === "1")!;
    const after = out[0].lines.find((l) => l.nsId === "1")!;
    expect(after.nsCrossImps).toBe(3);
    expect(after.ewCrossImps).toBe(before.ewCrossImps);
  });

  it("overrides only the AVE- side when the other side is neither +3 nor -3", () => {
    const boards = [ximpBoard(1, [line("A50/40", "1", "4"), ...field])];
    const out = applyBetterThanAverageXimpBoards(boards);
    const before = boards[0].lines.find((l) => l.nsId === "1")!;
    const after = out[0].lines.find((l) => l.nsId === "1")!;
    expect(after.nsCrossImps).toBe(before.nsCrossImps);
    expect(after.ewCrossImps).toBe(-3);
  });

  it("passes a line whose outcome is not a string through untouched", () => {
    const odd = {
      nsId: "1",
      ewId: "4",
      score: 400,
      nsCrossImps: 2,
      ewCrossImps: -2,
    } as any;
    const out = applyBetterThanAverageXimpBoards([{ board: 1, lines: [odd] }]);
    expect(out[0].lines[0]).toBe(odd);
  });

  it("ignores a non-real line that (defensively) carries a raw score when averaging", () => {
    const artificialWithScore = {
      outcome: "A60/40",
      nsId: "1",
      ewId: "4",
      score: 400,
      nsCrossImps: 3,
      ewCrossImps: -3,
    } as any;
    const out = applyBetterThanAverageXimpBoards([
      { board: 1, lines: [artificialWithScore] },
    ]);
    // No real boards in the window, so the flat +3 / -3 stands.
    expect(out[0].lines[0].nsCrossImps).toBe(3);
    expect(out[0].lines[0].ewCrossImps).toBe(-3);
  });
});
