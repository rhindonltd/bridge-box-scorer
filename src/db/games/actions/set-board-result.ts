import "server-only";

import { and, eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { boards } from "@/db/games/tables/boards";
import { matches } from "@/db/games/tables/matches";
import { BoardOutcome } from "@/model/score";
import { parseSeat } from "@/model/participants";

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

/**
 * Locates a whole (section?, round, table) of boards — one room of a match.
 *
 * `boardNumber` disambiguates a TRIPLE: a triple's home table hosts TWO
 * separate 10-VP comparisons (two distinct `matches` rows) on two disjoint
 * board sets, so (round, table) alone does not pick one. The board the director
 * acted from belongs to exactly one comparison (via `boards.matchId`), so
 * supplying it resolves the right match. Ordinary matches have one match per
 * (round, table) and are unaffected whether or not a board is supplied.
 */
export interface MatchRoomKey {
  section?: string;
  roundNumber: number;
  tableNumber: number;
  boardNumber?: number;
}

function matchRoomWhere(key: MatchRoomKey) {
  const clauses = [
    eq(boards.roundNumber, key.roundNumber),
    eq(boards.tableNumber, key.tableNumber),
  ];
  if (key.section !== undefined) {
    clauses.unshift(eq(boards.section, key.section));
  }
  if (key.boardNumber !== undefined) {
    clauses.push(eq(boards.boardNumber, key.boardNumber));
  }
  return and(...clauses);
}

/**
 * A db handle that can both read (to resolve the match) and write a match-level
 * ruling. Match-level rulings now live on the `matches` row, so these writers
 * need select + update (not just update like the per-board writers).
 */
type MatchRulingWriter = Pick<BetterSQLite3Database, "select" | "update">;

/**
 * Resolve the `matches` row the acted room belongs to, and whether the acted
 * table is that match's HOME (lower-table / canonical primary) side.
 *
 * The ruling token the director supplies is expressed relative to the ACTED
 * room's seats; the match row stores it home-relative, so the caller inverts
 * the offender side / mismatched side when the acted table is the opponent's.
 */
async function resolveActedMatch(
  db: MatchRulingWriter,
  key: MatchRoomKey,
): Promise<{ matchId: number; actedIsHome: boolean } | null> {
  const boardRow = (
    await db
      .select({ matchId: boards.matchId })
      .from(boards)
      .where(matchRoomWhere(key))
      .limit(1)
  )[0];
  if (!boardRow) return null;

  const matchRow = (
    await db
      .select({ home: matches.home })
      .from(matches)
      .where(eq(matches.id, boardRow.matchId))
      .limit(1)
  )[0];
  if (!matchRow) return null;

  let homeTable: number;
  try {
    homeTable = parseSeat(matchRow.home).tableNumber;
  } catch {
    // Should not happen (home is always a seat id); treat the acted room as home.
    return { matchId: boardRow.matchId, actedIsHome: true };
  }
  return { matchId: boardRow.matchId, actedIsHome: homeTable === key.tableNumber };
}

/** Write a ruling token onto a match row. */
async function writeMatchRuling(
  db: MatchRulingWriter,
  matchId: number,
  ruling: string,
): Promise<void> {
  await db.update(matches).set({ ruling }).where(eq(matches.id, matchId));
}

/**
 * Void a whole TEAMS match (EBU White Book §3.3.6.1 / §3.3.9). Writes the
 * `VOID:<cause>` ruling onto the match's `matches.ruling` (home-relative). The
 * teams VP scorer reads it and credits each team a ruling VP instead of a
 * margin → VP. The `cause` is supplied relative to the acted room's seats; it
 * is inverted to home-relative when the director acted from the opponent room.
 */
export async function voidTeamsMatch(
  db: MatchRulingWriter,
  key: MatchRoomKey,
  causeToken: string,
): Promise<void> {
  const resolved = await resolveActedMatch(db, key);
  if (!resolved) return;
  const ruling = resolved.actedIsHome
    ? causeToken
    : invertVoidCauseToken(causeToken);
  await writeMatchRuling(db, resolved.matchId, ruling);
}

/**
 * Void a whole SWISS-PAIRS match (EBU White Book §3.3.8 / §3.3.9). A pairs
 * match is one table, so the acted room IS the match (home = its NS). Writes
 * the `VOIDP:<cause>` ruling onto `matches.ruling`. The scorer removes the
 * match from the field the other pairs are matchpointed against and credits
 * each of the two pairs an AVE+/AVE−/AVE compensation per the cause.
 */
export async function voidPairsMatch(
  db: MatchRulingWriter,
  key: MatchRoomKey,
  causeToken: string,
): Promise<void> {
  const resolved = await resolveActedMatch(db, key);
  if (!resolved) return;
  // A pairs match is a single table: the acted room is always the home side
  // (home = this table's NS), so no inversion is needed.
  await writeMatchRuling(db, resolved.matchId, causeToken);
}

/**
 * Mark a whole SWISS match (pairs or teams) a MISMATCH (EBU White Book §3.5).
 * Writes the `MM:<side>:<direction>:<fault>` ruling onto `matches.ruling`
 * (home-relative). The boards are NOT cancelled — they stay real and in the
 * field; the Swiss VP scorers read the ruling and recompute ONLY the mismatched
 * side's round VP via the §3.5.2 adjustment. The ruling is supplied relative to
 * the acted room's seats; its `side` is flipped when the acted table is the
 * opponent's (teams) room.
 */
export async function markMismatch(
  db: MatchRulingWriter,
  key: MatchRoomKey,
  rulingToken: string,
): Promise<void> {
  const resolved = await resolveActedMatch(db, key);
  if (!resolved) return;
  const ruling = resolved.actedIsHome
    ? rulingToken
    : invertMismatchSideToken(rulingToken);
  await writeMatchRuling(db, resolved.matchId, ruling);
}

/** Flip the offender side of a `VOID:SHORT_OFFENDER_NS/EW` token; others as-is. */
function invertVoidCauseToken(token: string): string {
  if (token === "VOID:SHORT_OFFENDER_NS") return "VOID:SHORT_OFFENDER_EW";
  if (token === "VOID:SHORT_OFFENDER_EW") return "VOID:SHORT_OFFENDER_NS";
  return token;
}

/** Flip the `side` field (NS↔EW) of an `MM:<side>:<dir>:<fault>` token. */
function invertMismatchSideToken(token: string): string {
  const parts = token.split(":");
  if (parts.length !== 4 || parts[0] !== "MM") return token;
  parts[1] = parts[1] === "NS" ? "EW" : "NS";
  return parts.join(":");
}
