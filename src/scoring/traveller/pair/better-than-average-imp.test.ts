import { describe, it, expect } from "vitest";
import {
  applyBetterThanAverageImpBoards,
  applyBetterThanAverageXimpBoards,
  type ScoredImpBoard,
} from "./better-than-average-imp";
import { scoreIMP, type ImpLine } from "./imp";
import { scoreXIMP, type XimpLine } from "./x-imp";
import type { PairLine } from "./common";
import type { BoardOutcome } from "@/model/score";

function line(outcome: string, nsId: string, ewId: string): PairLine {
  return { outcome: outcome as BoardOutcome, nsId, ewId };
}

function impBoard(boardNo: number, lines: PairLine[]): ScoredImpBoard<ImpLine> {
  return { board: boardNo, lines: scoreIMP(boardNo, lines) };
}
function ximpBoard(
  boardNo: number,
  lines: PairLine[],
): ScoredImpBoard<XimpLine> {
  return { board: boardNo, lines: scoreXIMP(boardNo, lines) };
}

function nsImps(
  boards: ScoredImpBoard<ImpLine>[],
  boardNo: number,
  nsId: string,
): number {
  const b = boards.find((x) => x.board === boardNo)!;
  return b.lines.find((l) => l.nsId === nsId)!.nsImps;
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

describe("applyBetterThanAverageImpBoards (Butler IMP)", () => {
  it("leaves a board with no artificial lines unchanged", () => {
    const boards = [
      impBoard(1, [line("3NTN=", "1", "4"), line("2NTN=", "2", "5")]),
    ];
    expect(applyBetterThanAverageImpBoards(boards)).toEqual(boards);
  });

  it("keeps the flat +3 for AVE+ when the pair averages below +3", () => {
    // Pair 1 passes out both real boards (0 IMPs each) → average 0 < +3.
    const boards = [
      impBoard(1, [line("PO", "1", "4")]),
      impBoard(2, [line("PO", "1", "4")]),
      impBoard(3, [line("A60/40", "1", "4")]),
    ];
    const out = applyBetterThanAverageImpBoards(boards);
    expect(nsImps(out, 3, "1")).toBe(3);
  });

  it("uplifts AVE+ to the pair's actual average when it exceeds +3", () => {
    // Two real boards of the SAME board number (so same vulnerability) where
    // pair 1 (NS) makes a slam — a big positive IMP well above +3. Reusing the
    // same board number keeps the two real results identical, so the average
    // equals a single board's value.
    const realLines = [line("6NTN=", "1", "4")];
    const played = nsImps([impBoard(1, realLines)], 1, "1");
    expect(played).toBeGreaterThan(3); // sanity: clears the +3 band

    const boards = [
      impBoard(1, realLines),
      impBoard(1, realLines), // same board number → identical result
      impBoard(2, [line("A60/40", "1", "4")]),
    ];
    const out = applyBetterThanAverageImpBoards(boards);
    // Average of the two identical real boards = `played`; AVE+ gives that.
    expect(nsImps(out, 2, "1")).toBeCloseTo(played);
  });

  it("keeps the flat value when the pair has no real boards in the window", () => {
    const boards = [impBoard(1, [line("A60/40", "1", "4")])];
    const out = applyBetterThanAverageImpBoards(boards);
    expect(nsImps(out, 1, "1")).toBe(3); // flat +3, no real boards
  });

  it("leaves a non-AVE+/AVE- custom adjusted score untouched", () => {
    // A50/50 is AVE (0 IMPs each side), not an exact +3/-3, so no uplift —
    // even though the pair tops its real board.
    const boards = [
      impBoard(1, [line("6NTN=", "1", "4")]),
      impBoard(2, [line("A50/50", "1", "4")]),
    ];
    const out = applyBetterThanAverageImpBoards(boards);
    expect(nsImps(out, 2, "1")).toBe(0); // AVE stays 0, not uplifted
  });
});

describe("applyBetterThanAverageXimpBoards (Cross-IMP)", () => {
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
    // below -3 (cross-IMP is signed, unlike datum-less IMP). AVE- gives that.
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
});
