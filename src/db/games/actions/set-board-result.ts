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

/**
 * Cancel a board copy that could not be played in its intended form (fouled,
 * mis-dealt, arrow-switched, out of time) — EBU White Book §3.3.2. Writes the
 * director's chosen artificial adjusted score (`A<ns>/<ew>`, the fault split
 * the TD decides) to `directorOverrideResult` and flips the row to CANCELLED.
 * The copy still occupies a seat in the field (and the correctly-played copies
 * form a Neuberg-scaled sub-field); the CANCELLED status is what distinguishes
 * a fouled board from a plain adjusted-score correction (OVERRIDDEN) — the
 * stored outcome is otherwise identical.
 */
export async function cancelBoardResult(
  db: BoardsWriter,
  key: BoardKey,
  result: BoardOutcome,
): Promise<void> {
  await db
    .update(boards)
    .set({ directorOverrideResult: result, status: "CANCELLED" })
    .where(boardWhere(key));
}

/**
 * Remove a board from a TEAMS match that could not be played (EBU White Book
 * §3.3.7). Writes the removal fault token (`TRM:<fault>`) to
 * `directorOverrideResult` and flips the row to REMOVED_TEAMS, so the teams IMP
 * scorers award the ±3 IMP indemnity for the board instead of a table
 * comparison. The fault is expressed relative to this row's NS/EW seats; the
 * scorer reads it from whichever room carries it (inverting for the opponent
 * room). Only one of the match's two rows need be marked.
 */
export async function removeTeamsBoardResult(
  db: BoardsWriter,
  key: BoardKey,
  faultToken: string,
): Promise<void> {
  await db
    .update(boards)
    .set({
      directorOverrideResult: faultToken as BoardOutcome,
      status: "REMOVED_TEAMS",
    })
    .where(boardWhere(key));
}

/** Locates a whole (section?, round, table) of boards — one room of a match. */
export interface MatchRoomKey {
  section?: string;
  roundNumber: number;
  tableNumber: number;
}

function matchRoomWhere(key: MatchRoomKey) {
  const clauses = [
    eq(boards.roundNumber, key.roundNumber),
    eq(boards.tableNumber, key.tableNumber),
  ];
  if (key.section !== undefined) {
    clauses.unshift(eq(boards.section, key.section));
  }
  return and(...clauses);
}

/**
 * Void a whole TEAMS match (EBU White Book §3.3.6.1 / §3.3.9). Flips every
 * board row of the selected room (the (round, table) the director acted from)
 * to VOID_MATCH and stamps the `VOID:<cause>` token into `directorOverrideResult`.
 * Marking one room suffices: the teams VP scorer reads the cause from whichever
 * room carries it (inverting the offender side for the opponent room), and
 * treats the whole match as void. The cause is expressed relative to the acted
 * row's NS/EW seats.
 */
export async function voidTeamsMatch(
  db: BoardsWriter,
  key: MatchRoomKey,
  causeToken: string,
): Promise<void> {
  await db
    .update(boards)
    .set({
      directorOverrideResult: causeToken as BoardOutcome,
      status: "VOID_MATCH",
    })
    .where(matchRoomWhere(key));
}

/**
 * Void a whole SWISS-PAIRS match (EBU White Book §3.3.8 / §3.3.9). A pairs
 * match is one table (NS vs EW on the same board rows), so this flips every
 * board row of the (round, table) to VOID_PAIR and stamps the `VOIDP:<cause>`
 * token into `directorOverrideResult`. The scorer removes these rows from the
 * field the other pairs are matchpointed against and credits each of the two
 * pairs an AVE+/AVE−/AVE compensation per the cause. The cause is expressed
 * relative to the acted row's NS/EW seats.
 */
export async function voidPairsMatch(
  db: BoardsWriter,
  key: MatchRoomKey,
  causeToken: string,
): Promise<void> {
  await db
    .update(boards)
    .set({
      directorOverrideResult: causeToken as BoardOutcome,
      status: "VOID_PAIR",
    })
    .where(matchRoomWhere(key));
}

/**
 * Mark a whole SWISS match (pairs or teams) a MISMATCH (EBU White Book §3.5).
 * Flips every board row of the acted room (round + table) to MISMATCH and
 * stamps the `MM:<side>:<direction>:<fault>` token into `directorOverrideResult`.
 * The boards are NOT cancelled — they stay real and in the field; the Swiss VP
 * scorers read the token and recompute ONLY the mismatched side's round VP via
 * the §3.5.2 adjustment. The ruling is expressed relative to the acted row's
 * seats (NS = this table / home team, EW = the opponents).
 */
export async function markMismatch(
  db: BoardsWriter,
  key: MatchRoomKey,
  rulingToken: string,
): Promise<void> {
  await db
    .update(boards)
    .set({
      // The ruling goes in its OWN column so the board keeps its real played
      // result in `confirmedResult`/`directorOverrideResult` and still scores
      // normally in the field; only the final per-round VP is adjusted.
      matchRuling: rulingToken,
      status: "MISMATCH",
    })
    .where(matchRoomWhere(key));
}
