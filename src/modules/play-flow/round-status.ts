/**
 * Determines if a board should be considered "entered" (resolved).
 * A board is entered if any of:
 * - directorOverrideResult is non-null (director override or cancellation)
 * - confirmedResult is non-null
 * - status is CONFIRMED, PENDING_CONFIRMATION, OVERRIDDEN, or CANCELLED
 *
 * Note: NOT_PLAYED is the initial state set when boards are created and does
 * NOT indicate a result has been entered.
 */
export function isBoardEntered(board: {
  confirmedResult?: string | null;
  directorOverrideResult?: string | null;
  status?: string | null;
}): boolean {
  if (board.directorOverrideResult != null) return true;
  if (board.confirmedResult != null) return true;
  if (
    board.status === "CONFIRMED" ||
    board.status === "PENDING_CONFIRMATION" ||
    board.status === "OVERRIDDEN" ||
    board.status === "CANCELLED" ||
    board.status === "REMOVED_TEAMS"
  )
    return true;
  return false;
}
