/**
 * A board row that may carry the director's "played the wrong way round" flag.
 * Structural so it applies to full `Board` rows and to the narrower column
 * selections the queries use.
 */
export interface SeatSwappable {
  ns: string;
  ew: string;
  seatsSwapped?: boolean | null;
}

/**
 * Apply the director's "played reversed" ruling to a board row.
 *
 * The result belongs to the hands, so it is left exactly as entered; only the
 * pairs credited with it change. A flagged row has its `ns` and `ew` exchanged,
 * so the pair recorded as NS receives the EW side of the board and vice versa.
 * Unflagged rows are returned as-is. Never mutates its input.
 */
export function applySeatSwap<T extends SeatSwappable>(row: T): T {
  if (!row.seatsSwapped) return row;
  return { ...row, ns: row.ew, ew: row.ns };
}

/** {@link applySeatSwap} over a list of rows. */
export function applySeatSwaps<T extends SeatSwappable>(
  rows: readonly T[],
): T[] {
  return rows.map(applySeatSwap);
}
