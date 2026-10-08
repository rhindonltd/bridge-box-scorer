import { describe, it, expect } from "vitest";
import { applyBetterThanAverage } from "./better-than-average";
import { scoreMP } from "./mp";
import { ScoredMpBoard } from "./neuberg-across-boards";
import type { PairLine } from "./common";
import type { BoardOutcome } from "@/model/score";

function line(outcome: string, nsId: string, ewId: string): PairLine {
  return { outcome: outcome as BoardOutcome, nsId, ewId };
}

function board(boardNo: number, lines: PairLine[]): ScoredMpBoard {
  return { board: boardNo, lines: scoreMP(boardNo, lines) };
}

/** The NS line's matchpoints on a board for a pair, from the output. */
function nsMp(boards: ScoredMpBoard[], boardNo: number, nsId: string): number {
  const b = boards.find((x) => x.board === boardNo)!;
  return b.lines.find((l) => l.nsId === nsId)!.nsMatchPoints;
}
function ewMp(boards: ScoredMpBoard[], boardNo: number, ewId: string): number {
  const b = boards.find((x) => x.board === boardNo)!;
  return b.lines.find((l) => l.ewId === ewId)!.ewMatchPoints;
}

describe("applyBetterThanAverage", () => {
  it("leaves a board with no artificial lines unchanged", () => {
    const boards = [
      board(1, [line("3NTN=", "1", "4"), line("2NTN=", "2", "5")]),
    ];
    expect(applyBetterThanAverage(boards)).toEqual(boards);
  });

  it("keeps the flat 60% for AVE+ when the pair averages below 60%", () => {
    // Pair "1" plays two real boards badly (bottom both), averaging well under
    // 60%, plus an AVE+ board (A60/40, pair 1 NS = AVE+). Field of 3 so top=4.
    const boards = [
      // Board 1: pair 1 bottom (3 lines → top 4), so ns MP = 0.
      board(1, [
        line("2NTN=", "1", "4"), // 120, lowest
        line("3NTN=", "2", "5"), // 400
        line("3NTN+1", "3", "6"), // 430, top
      ]),
      // Board 2: pair 1 bottom again.
      board(2, [
        line("2NTN=", "1", "4"),
        line("3NTN=", "2", "5"),
        line("3NTN+1", "3", "6"),
      ]),
      // Board 3: pair 1 given AVE+ (A60/40), 3-line field so top = 4.
      board(3, [
        line("A60/40", "1", "4"),
        line("3NTN=", "2", "5"),
        line("3NTN+1", "3", "6"),
      ]),
    ];

    const out = applyBetterThanAverage(boards);
    // Pair 1 averaged 0% on its real boards → flat 60% of top (4) = 2.4.
    expect(nsMp(out, 3, "1")).toBeCloseTo(0.6 * 4);
  });

  it("uplifts AVE+ to the pair's actual average when it exceeds 60%", () => {
    // Pair 1 tops its two real boards (100%), then gets AVE+ on board 3.
    const boards = [
      board(1, [
        line("3NTN+1", "1", "4"), // 430 top
        line("3NTN=", "2", "5"),
        line("2NTN=", "3", "6"),
      ]),
      board(2, [
        line("3NTN+1", "1", "4"), // top again
        line("3NTN=", "2", "5"),
        line("2NTN=", "3", "6"),
      ]),
      board(3, [
        line("A60/40", "1", "4"),
        line("3NTN=", "2", "5"),
        line("2NTN=", "3", "6"),
      ]),
    ];

    const out = applyBetterThanAverage(boards);
    // Pair 1 averaged 100% → AVE+ gives 100% of top (4) = 4, not a flat 2.4.
    expect(nsMp(out, 3, "1")).toBeCloseTo(4);
  });

  it("downlifts AVE- to the pair's actual average when it is below 40%", () => {
    // The EW pair on an A60/40 board is AVE- (ew=40). Make that pair (EW "4")
    // average 0% on its real boards → AVE- gives its 0%, not a flat 40%.
    const boards = [
      board(1, [
        // EW pair "4" sits with NS "1"; give NS the top so EW is bottom.
        line("3NTN+1", "1", "4"),
        line("3NTN=", "2", "5"),
        line("2NTN=", "3", "6"),
      ]),
      board(2, [
        line("3NTN+1", "1", "4"),
        line("3NTN=", "2", "5"),
        line("2NTN=", "3", "6"),
      ]),
      board(3, [
        line("A60/40", "7", "4"), // NS=60 (AVE+), EW "4"=40 (AVE-)
        line("3NTN=", "8", "5"),
        line("2NTN=", "9", "6"),
      ]),
    ];

    const out = applyBetterThanAverage(boards);
    // EW "4" averaged 0% → AVE- gives 0% of top (4) = 0, not a flat 1.6.
    expect(ewMp(out, 3, "4")).toBeCloseTo(0);
  });

  it("keeps the flat value when the pair has no real boards in the window", () => {
    // Pair 1 appears ONLY on an AVE+ board — no real boards → flat 60%.
    const boards = [
      board(1, [
        line("A60/40", "1", "4"),
        line("3NTN=", "2", "5"),
        line("3NTN+1", "3", "6"),
      ]),
    ];
    const out = applyBetterThanAverage(boards);
    expect(nsMp(out, 1, "1")).toBeCloseTo(0.6 * 4);
  });

  it("leaves a non-AVE+/AVE- custom adjusted score untouched", () => {
    // A70/30 is the director's deliberate figure — not an exact 60/40 — so no
    // override applies to either side.
    const boards = [
      board(1, [
        line("3NTN+1", "1", "4"), // pair 1 tops its real board (100%)
        line("3NTN=", "2", "5"),
        line("2NTN=", "3", "6"),
      ]),
      board(2, [
        line("A70/30", "1", "4"),
        line("3NTN=", "2", "5"),
        line("2NTN=", "3", "6"),
      ]),
    ];
    const out = applyBetterThanAverage(boards);
    // Unchanged: 70% of top (4) = 2.8, NOT uplifted to the pair's 100% average.
    expect(nsMp(out, 2, "1")).toBeCloseTo(0.7 * 4);
  });
});
