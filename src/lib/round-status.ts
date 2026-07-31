export interface BoardEntry {
  roundNumber: number;
  tableNumber: number;
  boardNumber: number;
  hasResult: boolean;
}

export interface TableRoundStatus {
  tableNumber: number;
  currentRound: number;
  boardsEntered: number;
  boardsTotal: number;
  hasMissingPreviousRounds: boolean;
  missingRounds: number[];
}

/**
 * Determines if a board should be considered "entered" (resolved).
 * A board is entered if any of:
 * - directorOverrideResult is non-null (director override exists)
 * - confirmedResult is non-null
 * - status is CONFIRMED, PENDING_CONFIRMATION, or OVERRIDDEN
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
  if (board.status === "CONFIRMED" || board.status === "PENDING_CONFIRMATION" || board.status === "OVERRIDDEN") return true;
  return false;
}

/**
 * Computes per-table round status from a flat list of board entries.
 *
 * For each table:
 * - currentRound: highest round number where at least one board has a result
 * - boardsEntered: count of entered boards in currentRound
 * - boardsTotal: total boards in currentRound at that table
 * - hasMissingPreviousRounds: true if any round < currentRound has unentered boards
 * - missingRounds: list of rounds < currentRound with unentered boards
 *
 * Returns results sorted by tableNumber ascending.
 * If a table has no entered boards at all, currentRound=0, boardsEntered=0, boardsTotal=0.
 */
export function computeRoundStatus(boards: BoardEntry[]): TableRoundStatus[] {
  // Group by tableNumber
  const byTable = new Map<number, BoardEntry[]>();
  for (const b of boards) {
    const arr = byTable.get(b.tableNumber) ?? [];
    arr.push(b);
    byTable.set(b.tableNumber, arr);
  }

  const results: TableRoundStatus[] = [];

  for (const [tableNumber, tableBoards] of byTable) {
    // Group by round
    const byRound = new Map<number, BoardEntry[]>();
    for (const b of tableBoards) {
      const arr = byRound.get(b.roundNumber) ?? [];
      arr.push(b);
      byRound.set(b.roundNumber, arr);
    }

    // Find currentRound (highest round with at least one entered board)
    let currentRound = 0;
    for (const [round, roundBoards] of byRound) {
      if (roundBoards.some((b) => b.hasResult)) {
        currentRound = Math.max(currentRound, round);
      }
    }

    // Compute boardsEntered and boardsTotal for currentRound
    let boardsEntered = 0;
    let boardsTotal = 0;
    if (currentRound > 0) {
      const currentRoundBoards = byRound.get(currentRound) ?? [];
      boardsTotal = currentRoundBoards.length;
      boardsEntered = currentRoundBoards.filter((b) => b.hasResult).length;
    }

    // Check for missing previous rounds
    const missingRounds: number[] = [];
    if (currentRound > 1) {
      for (let r = 1; r < currentRound; r++) {
        const roundBoards = byRound.get(r);
        if (roundBoards && roundBoards.some((b) => !b.hasResult)) {
          missingRounds.push(r);
        }
      }
    }

    results.push({
      tableNumber,
      currentRound,
      boardsEntered,
      boardsTotal,
      hasMissingPreviousRounds: missingRounds.length > 0,
      missingRounds,
    });
  }

  // Sort by tableNumber
  results.sort((a, b) => a.tableNumber - b.tableNumber);

  return results;
}
