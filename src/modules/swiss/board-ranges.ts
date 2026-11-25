/**
 * Board ranges for Swiss rounds (pairs and teams): which boards a round plays,
 * and how a round splits into two half-matches.
 */

/**
 * The board-number range a Swiss round plays. Rounds use fresh boards that grow
 * with the round: round R plays boards `(R-1)*boardsPerRound + 1` through
 * `R*boardsPerRound`, all tables playing the same set simultaneously.
 */
export function swissRoundBoardRange(
  roundNumber: number,
  boardsPerRound: number,
): { boardStart: number; boardEnd: number } {
  const boardStart = (roundNumber - 1) * boardsPerRound + 1;
  return { boardStart, boardEnd: boardStart + boardsPerRound - 1 };
}

/** A contiguous inclusive board-number range. */
export interface BoardSpan {
  start: number;
  end: number;
}

/**
 * Split a round's board range into the two halves of a "2 half matches" group.
 *
 * The round's `boardsPerRound` boards are split down the middle into two equal
 * halves; an ODD count rounds **down** (the final board of the round is
 * discarded for the group so each half is the same size and no pair plays a
 * board the anchor can't also play once). So a 6-board round → S1 boards 1–3,
 * S2 boards 4–6; an 8-board round → 1–4 / 5–8; a 7-board round → 1–3 / 4–6 with
 * board 7 dropped. Returns `null` when fewer than two boards would be in each
 * half (nothing to split), so the caller can fall back to a bye.
 *
 * `halfSize` is the common size of each half (`floor(boardsPerRound / 2)`).
 */
export function swissHalfMatchBoardSplit(
  roundNumber: number,
  boardsPerRound: number,
): { halfOne: BoardSpan; halfTwo: BoardSpan; halfSize: number } | null {
  const halfSize = Math.floor(boardsPerRound / 2);
  if (halfSize < 1) return null;

  const { boardStart } = swissRoundBoardRange(roundNumber, boardsPerRound);
  const halfOne: BoardSpan = {
    start: boardStart,
    end: boardStart + halfSize - 1,
  };
  const halfTwo: BoardSpan = {
    start: boardStart + halfSize,
    end: boardStart + 2 * halfSize - 1,
  };
  return { halfOne, halfTwo, halfSize };
}
