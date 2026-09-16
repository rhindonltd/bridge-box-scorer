import "server-only";

import { getDb } from "@/db/games";
import { boards, NewBoard } from "@/db/games/tables/boards";
import { assignments, Assignment } from "@/db/games/tables/assignments";
import { and, eq } from "drizzle-orm";
import { SectionLetter } from "@/model/participants";
import {
  buildSectionRows,
  type MaterializableMovement,
} from "@/services/materialize-movement";
import { swissRoundBoardRange } from "@/services/materialize-swiss-round";
import {
  expandTeamMatches,
  type SwissTeamsMatch,
} from "@/movement/swiss-teams/swiss-teams-pairing";

/**
 * A stable per-section seed for the Swiss Teams round-1 random draw. Derived
 * from the gameId + section so a re-materialization of round 1 (e.g. a retried
 * start) reproduces the same pairing, and different sections draw independently.
 */
export function swissTeamsRoundOneSeed(
  gameId: string,
  section: SectionLetter,
): number {
  const input = `${gameId}|${section}`;
  // FNV-1a 32-bit: small, deterministic, dependency-free.
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * The section-UNqualified movement id for a team's home pair (NS) at table T:
 * "${T}NS". `buildSectionRows` prefixes the section later. A team's away pair
 * (EW) at its home table T is "${T}EW". These match the ids `findTeams`/the
 * schedule join on (the section-qualified home seat).
 */
function homePairId(tableNumber: number): string {
  return `${tableNumber}NS`;
}

function awayPairId(tableNumber: number): string {
  return `${tableNumber}EW`;
}

/**
 * Turn a drawn Swiss Teams round into the {@link MaterializableMovement} shape.
 *
 * Each team match becomes two physical tables (open room + closed room) that
 * play the same boards. At a table hosting team H against team A:
 *   - NS is H's home pair (id "${H}NS", which never leaves its home table),
 *   - EW is A's away pair (id "${A}EW", which travels here from A's home table).
 * So every pair keeps its stable id all event; only the away pair's table
 * changes round to round.
 */
export function swissTeamsRoundToMaterializable(
  roundNumber: number,
  boardsPerRound: number,
  matches: SwissTeamsMatch[],
): MaterializableMovement {
  const { boardStart, boardEnd } = swissRoundBoardRange(
    roundNumber,
    boardsPerRound,
  );

  return expandTeamMatches(matches).map((placement) => ({
    tableNumber: placement.tableNumber,
    rounds: [
      {
        roundNumber,
        ns: homePairId(placement.nsTeam),
        ew: awayPairId(placement.ewTeam),
        boardStart,
        boardEnd,
      },
    ],
  }));
}

/**
 * Append a single Swiss Teams round's boards (and, for round 1, the seat
 * assignments) to a game's database in one transaction. Idempotent per round:
 * if the round already has boards, nothing is written (so a retried draw or
 * start can't duplicate a round). Mirrors {@link materializeSwissRound}.
 */
export async function materializeSwissTeamsRound(
  gameId: string,
  section: SectionLetter,
  roundNumber: number,
  boardsPerRound: number,
  matches: SwissTeamsMatch[],
): Promise<{ written: boolean }> {
  const db = await getDb(gameId);
  if (!db) {
    throw new Error("Game db does not exist");
  }

  const existing = await db
    .select({ n: boards.boardNumber })
    .from(boards)
    .where(and(eq(boards.section, section), eq(boards.roundNumber, roundNumber)))
    .limit(1);

  if (existing.length > 0) {
    return { written: false };
  }

  const movement = swissTeamsRoundToMaterializable(
    roundNumber,
    boardsPerRound,
    matches,
  );

  const { boardRows, assignmentRows } = buildSectionRows(section, movement);

  insertRows(db, boardRows, assignmentRows);

  return { written: true };
}

/** Insert board and assignment rows in a single transaction. */
function insertRows(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  boardRows: NewBoard[],
  assignmentRows: Assignment[],
): void {
  db.transaction((tx) => {
    if (boardRows.length > 0) {
      tx.insert(boards).values(boardRows).run();
    }
    if (assignmentRows.length > 0) {
      tx.insert(assignments).values(assignmentRows).run();
    }
  });
}
