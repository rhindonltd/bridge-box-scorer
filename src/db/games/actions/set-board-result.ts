import "server-only";

import { and, eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { boards } from "@/db/games/tables/boards";
import { BoardOutcome } from "@/model/score";

/**
 * Minimal shape of the game db handle this action needs. Kept structural so
 * callers can pass the resolved `getDb(gameId)` handle without importing a
 * concrete db type here.
 */
type BoardsWriter = Pick<BetterSQLite3Database, "update">;

/** Locates a single board row. `section` is optional: player submissions are
 *  section-scoped (sections can share a table number), whereas the director
 *  override addresses a board by round/table/board alone. */
export interface BoardKey {
  section?: string;
  roundNumber: number;
  tableNumber: number;
  boardNumber: number;
}

function boardWhere(key: BoardKey) {
  const clauses = [
    eq(boards.roundNumber, key.roundNumber),
    eq(boards.tableNumber, key.tableNumber),
    eq(boards.boardNumber, key.boardNumber),
  ];
  if (key.section !== undefined) {
    clauses.unshift(eq(boards.section, key.section));
  }
  return and(...clauses);
}

/**
 * Record a confirmed player result on a board (both sides agreed). Sets the
 * `confirmedResult` and flips the row to CONFIRMED. Shared by the submit-result
 * confirmation path.
 */
export async function confirmBoardResult(
  db: BoardsWriter,
  key: BoardKey,
  result: BoardOutcome,
): Promise<void> {
  await db
    .update(boards)
    .set({ confirmedResult: result, status: "CONFIRMED" })
    .where(boardWhere(key));
}

/**
 * Record a director override on a board. Sets `directorOverrideResult` and
 * flips the row to OVERRIDDEN. Shared by the traveller override path.
 */
export async function overrideBoardResult(
  db: BoardsWriter,
  key: BoardKey,
  result: BoardOutcome,
): Promise<void> {
  await db
    .update(boards)
    .set({ directorOverrideResult: result, status: "OVERRIDDEN" })
    .where(boardWhere(key));
}
