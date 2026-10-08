import { describe, it, expect } from "vitest";
import {
  equaliseMpBoards,
  expectedFieldSize,
  ScoredMpBoard,
} from "./neuberg-across-boards";
import { scoreMP } from "./mp";
import type { PairLine } from "./common";
import type { BoardOutcome } from "@/model/score";

function line(outcome: string, nsId: string, ewId: string): PairLine {
  return { outcome: outcome as BoardOutcome, nsId, ewId };
}

/** Score a board's outcomes into a ScoredMpBoard the equaliser consumes. */
function board(boardNo: number, lines: PairLine[]): ScoredMpBoard {
  return { board: boardNo, lines: scoreMP(boardNo, lines) };
}

describe("expectedFieldSize", () => {
  it("is the largest line count across boards", () => {
    const boards = [
      board(1, [line("3NTN=", "1", "4"), line("2NTN=", "2", "5")]), // A=2
      board(2, [
        line("3NTN=", "1", "4"),
        line("2NTN=", "2", "5"),
        line("3NTN+1", "3", "6"),
      ]), // A=3
    ];
    expect(expectedFieldSize(boards)).toBe(3);
  });

  it("is 0 for no boards", () => {
    expect(expectedFieldSize([])).toBe(0);
  });
});

describe("equaliseMpBoards", () => {
  it("leaves fully-played boards untouched (all boards same size)", () => {
    const boards = [
      board(1, [line("3NTN=", "1", "4"), line("2NTN=", "2", "5")]),
      board(2, [line("3NTN+1", "1", "4"), line("2NTN=", "2", "5")]),
    ];
    const out = equaliseMpBoards(boards);
    expect(out).toEqual(boards);
  });

  it("Neuberg-scales a short board up to the full-field top", () => {
    // Full field E = 4 (board 2 has 4 lines, top 2*(4-1) = 6).
    // Short board (board 1) has A = 2 lines, top 2.
    const full = board(2, [
      line("3NTN+2", "1", "4"), // 490 top
      line("3NTN+1", "2", "5"), // 460
      line("3NTN=", "3", "6"), // 400
      line("2NTN=", "7", "8"), // 120 bottom
    ]);
    const short = board(1, [
      line("3NTN=", "1", "4"), // 400 — beats the other → single MP 1
      line("2NTN=", "2", "5"), // 120 — single MP 0
    ]);

    const out = equaliseMpBoards([short, full]);
    const shortOut = out.find((b) => b.board === 1)!;

    // Every line now carries the full-field top of 6.
    for (const l of shortOut.lines) {
      expect(l.maxMatchPoints).toBe(6);
      // ns + ew = max invariant preserved.
      expect(l.nsMatchPoints + l.ewMatchPoints).toBeCloseTo(6);
    }

    // Neuberg: top line (single MP 1, doubled 2) → ((1+1)*4/2 - 1)*2 ... via
    // the E/A ratio: ((2/2)+1)*(4/2) - 1 = 3 single → doubled 6 (full top).
    const top = shortOut.lines.find((l) => l.nsId === "1")!;
    expect(top.nsMatchPoints).toBeCloseTo(6);
    // Bottom line (single MP 0) → (0+1)*(4/2) - 1 = 1 single → doubled 2.
    const bottom = shortOut.lines.find((l) => l.nsId === "2")!;
    expect(bottom.nsMatchPoints).toBeCloseTo(2);

    // Full board is unchanged.
    expect(out.find((b) => b.board === 2)!.lines).toEqual(full.lines);
  });

  it("uses the §4.2.3.3 small-sub-field rule for a 2-result group ≤ a third of the field", () => {
    // E = 6 (full board, 6 lines). Short board has A = 2 (2*3 = 6 ≤ 6).
    const fullLines: PairLine[] = [
      line("3NTN+3", "1", "4"),
      line("3NTN+2", "2", "5"),
      line("3NTN+1", "3", "6"),
      line("3NTN=", "7", "8"),
      line("2NTN+1", "9", "10"),
      line("2NTN=", "11", "12"),
    ];
    const full = board(2, fullLines);
    const short = board(1, [
      line("3NTN=", "1", "4"), // beats → single MP 1 → top 65%
      line("2NTN=", "2", "5"), // single MP 0 → bottom 55%
    ]);

    const out = equaliseMpBoards([short, full]);
    const shortOut = out.find((b) => b.board === 1)!;
    const fullTop = 2 * (6 - 1); // 10

    const top = shortOut.lines.find((l) => l.nsId === "1")!;
    const bottom = shortOut.lines.find((l) => l.nsId === "2")!;

    // 65% / 55% of the full-field top.
    expect(top.nsMatchPoints).toBeCloseTo(0.65 * fullTop);
    expect(bottom.nsMatchPoints).toBeCloseTo(0.55 * fullTop);
    expect(top.maxMatchPoints).toBe(fullTop);
  });

  it("uses 70/60/50 for a 3-result small sub-field", () => {
    // E = 9 so A=3 qualifies (3*3 = 9 ≤ 9).
    const fullLines: PairLine[] = Array.from({ length: 9 }, (_, i) =>
      line("3NTN=", `${i + 1}`, `${i + 20}`),
    );
    const full = board(2, fullLines);
    const short = board(1, [
      line("3NTN+1", "1", "4"), // 430 top → single MP 2 → 70%
      line("3NTN=", "2", "5"), // 400 middle → single MP 1 → 60%
      line("2NTN=", "3", "6"), // 120 bottom → single MP 0 → 50%
    ]);

    const out = equaliseMpBoards([short, full]);
    const shortOut = out.find((b) => b.board === 1)!;
    const fullTop = 2 * (9 - 1); // 16

    const top = shortOut.lines.find((l) => l.nsId === "1")!;
    const mid = shortOut.lines.find((l) => l.nsId === "2")!;
    const bottom = shortOut.lines.find((l) => l.nsId === "3")!;

    expect(top.nsMatchPoints).toBeCloseTo(0.7 * fullTop);
    expect(mid.nsMatchPoints).toBeCloseTo(0.6 * fullTop);
    expect(bottom.nsMatchPoints).toBeCloseTo(0.5 * fullTop);
  });

  it("falls back to Neuberg (not small sub-field) when A=3 but the group exceeds a third", () => {
    // E = 5, A = 3. 3*3 = 9 > 5 → Neuberg, not 70/50.
    const full = board(2, [
      line("3NTN+2", "1", "4"),
      line("3NTN+1", "2", "5"),
      line("3NTN=", "3", "6"),
      line("2NTN+1", "7", "8"),
      line("2NTN=", "9", "10"),
    ]);
    const short = board(1, [
      line("3NTN+1", "1", "4"), // top of 3
      line("3NTN=", "2", "5"),
      line("2NTN=", "3", "6"), // bottom of 3
    ]);

    const out = equaliseMpBoards([short, full]);
    const shortOut = out.find((b) => b.board === 1)!;
    const fullTop = 2 * (5 - 1); // 8

    // Neuberg top: single MP 2 (top of A=3) → ((2+1)*5/3 - 1) = 4 single → 8.
    const top = shortOut.lines.find((l) => l.nsId === "1")!;
    expect(top.nsMatchPoints).toBeCloseTo(8);
    // Not the 70% small-sub-field value (0.7*8 = 5.6).
    expect(top.nsMatchPoints).not.toBeCloseTo(0.7 * fullTop);
  });

  it("preserves an artificial adjusted line's percentage when scaling up", () => {
    // Short board (A=2): one real + one A70/30. Full field E=4.
    const full = board(2, [
      line("3NTN+2", "1", "4"),
      line("3NTN+1", "2", "5"),
      line("3NTN=", "3", "6"),
      line("2NTN=", "7", "8"),
    ]);
    const short = board(1, [
      line("3NTN=", "1", "4"), // real
      line("A70/30", "2", "5"), // artificial 70% NS
    ]);

    const out = equaliseMpBoards([short, full]);
    const shortOut = out.find((b) => b.board === 1)!;
    const fullTop = 2 * (4 - 1); // 6

    const adj = shortOut.lines.find((l) => l.nsId === "2")!;
    // 70% of the new full top, not re-matchpointed.
    expect(adj.nsMatchPoints).toBeCloseTo(0.7 * fullTop);
    expect(adj.ewMatchPoints).toBeCloseTo(0.3 * fullTop);
    expect(adj.maxMatchPoints).toBe(fullTop);
  });

  it("is a no-op for a single board", () => {
    const only = board(1, [
      line("3NTN=", "1", "4"),
      line("2NTN=", "2", "5"),
    ]);
    expect(equaliseMpBoards([only])).toEqual([only]);
  });
});
