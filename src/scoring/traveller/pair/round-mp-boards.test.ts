import { describe, it, expect } from "vitest";
import { roundMpBoards, roundHalfAwayFromAverage } from "./round-mp-boards";
import { equaliseMpBoards, ScoredMpBoard } from "./neuberg-across-boards";
import { scoreMP, MatchpointLine } from "./mp";
import type { PairLine } from "./common";
import type { BoardOutcome } from "@/model/score";

/** Build a MatchpointLine directly so exact-half inputs are deterministic. */
function mpLine(
  nsId: string,
  ewId: string,
  max: number,
  nsMp: number,
): MatchpointLine {
  return {
    nsId,
    ewId,
    outcome: "3NTN=" as BoardOutcome,
    score: 400,
    maxMatchPoints: max,
    nsMatchPoints: nsMp,
    ewMatchPoints: max - nsMp,
  };
}

function board(boardNo: number, lines: MatchpointLine[]): ScoredMpBoard {
  return { board: boardNo, lines };
}

describe("roundHalfAwayFromAverage", () => {
  it("rounds an exact half UP when above the average", () => {
    // avg 4; 4.5 is above → up to 5.
    expect(roundHalfAwayFromAverage(4.5, 4)).toBe(5);
  });

  it("rounds an exact half DOWN when below the average", () => {
    // avg 4; 3.5 is below → down to 3.
    expect(roundHalfAwayFromAverage(3.5, 4)).toBe(3);
  });

  it("rounds non-halves to the nearest integer regardless of side", () => {
    expect(roundHalfAwayFromAverage(3.4, 4)).toBe(3);
    expect(roundHalfAwayFromAverage(3.6, 4)).toBe(4);
    expect(roundHalfAwayFromAverage(4.9, 4)).toBe(5);
  });

  it("leaves whole values unchanged", () => {
    expect(roundHalfAwayFromAverage(4, 4)).toBe(4);
    expect(roundHalfAwayFromAverage(0, 4)).toBe(0);
    expect(roundHalfAwayFromAverage(8, 4)).toBe(8);
  });
});

describe("roundMpBoards", () => {
  it("rounds the two sides away from the average and keeps ns + ew = max", () => {
    // max 8 → avg 4. NS at 4.5 (above) rounds to 5; EW is the mirror below.
    const boards = [board(1, [mpLine("1", "2", 8, 4.5)])];
    const out = roundMpBoards(boards);
    const line = out[0].lines[0];
    expect(line.nsMatchPoints).toBe(5);
    expect(line.ewMatchPoints).toBe(3);
    expect(line.nsMatchPoints + line.ewMatchPoints).toBe(8);
  });

  it("rounds an NS half below the average down (EW half above goes up)", () => {
    // max 8 → avg 4. NS at 3.5 (below) rounds to 3; EW at 4.5 (above) → 5.
    const boards = [board(1, [mpLine("1", "2", 8, 3.5)])];
    const line = roundMpBoards(boards)[0].lines[0];
    expect(line.nsMatchPoints).toBe(3);
    expect(line.ewMatchPoints).toBe(5);
  });

  it("leaves a dead-average line untouched", () => {
    const boards = [board(1, [mpLine("1", "2", 8, 4)])];
    const line = roundMpBoards(boards)[0].lines[0];
    expect(line.nsMatchPoints).toBe(4);
    expect(line.ewMatchPoints).toBe(4);
  });

  it("leaves a neutered single-line board (max 0) unchanged", () => {
    const boards = [board(1, [mpLine("1", "2", 0, 0)])];
    const line = roundMpBoards(boards)[0].lines[0];
    expect(line.nsMatchPoints).toBe(0);
    expect(line.ewMatchPoints).toBe(0);
  });

  it("does not mutate the input boards", () => {
    const boards = [board(1, [mpLine("1", "2", 8, 4.5)])];
    roundMpBoards(boards);
    expect(boards[0].lines[0].nsMatchPoints).toBe(4.5);
  });

  it("rounds the fractional matchpoints Neuberg produces on a short board", () => {
    // A 2-line board scaled up to a 3-line field (E=3) via Neuberg produces
    // fractional tops; rounding must land every line on a whole matchpoint.
    const full = (outcome: string, nsId: string, ewId: string): PairLine => ({
      outcome: outcome as BoardOutcome,
      nsId,
      ewId,
    });
    const scored: ScoredMpBoard[] = [
      { board: 1, lines: scoreMP(1, [full("3NTN=", "1", "4"), full("2NTN=", "2", "5"), full("3NTN+1", "3", "6")]) },
      // Board 2 played at only two tables → gets Neuberg-scaled to E=3.
      { board: 2, lines: scoreMP(2, [full("3NTN+1", "1", "4"), full("2NTN=", "2", "5")]) },
    ];

    const rounded = roundMpBoards(equaliseMpBoards(scored));
    for (const b of rounded) {
      for (const line of b.lines) {
        expect(Number.isInteger(line.nsMatchPoints)).toBe(true);
        expect(Number.isInteger(line.ewMatchPoints)).toBe(true);
        expect(line.nsMatchPoints + line.ewMatchPoints).toBe(
          line.maxMatchPoints,
        );
      }
    }
  });
});
