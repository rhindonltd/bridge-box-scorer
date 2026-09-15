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
import {
  swissPairHomeSeat,
  type SwissPairId,
  type SwissSeating,
} from "@/movement/swiss/swiss-pairing";

/**
 * Phantom participant id used for the empty seat on a Swiss sit-out row. It is
 * not a valid seat, so the board-history reader ignores it (only the real
 * sitting-out pair is recorded as having had a bye). Kept distinct from any
 * real pair's seat id.
 */
const SWISS_SIT_OUT_PHANTOM = "PHANTOM";

/**
 * The stable, section-UNqualified movement id for a Swiss pair: its round-1
 * home position, e.g. "1NS" or "3EW". `buildSectionRows` later prefixes the
 * section (→ "A1NS"), exactly as the Mitchell family's ids ("1NS") are treated.
 *
 * Anchoring the id to the round-1 seat — rather than a bare integer — keeps
 * Swiss consistent with every other movement, where a board's ns/ew equals the
 * seated pair's assignment id / initialSeat. That identity is what the
 * schedule, leaderboard and player screens all join on.
 */
export function swissPairMovementId(
  tables: number,
  pairId: SwissPairId,
): string {
  const home = swissPairHomeSeat(tables, pairId);
  return `${home.tableNumber}${home.direction}`;
}

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

/**
 * Turn a drawn Swiss round into the {@link MaterializableMovement} shape (one
 * "table" per seating entry, each with the single round R). Pair ids become the
 * movement participant ids (later section-qualified by buildSectionRows), so a
 * pair's stable integer id round-trips through the boards rows.
 *
 * The sit-out pair, if any, is emitted as an extra sit-out "table": it keeps the
 * pair on the NS seat with a phantom opponent and is flagged `sitOut`, so its
 * boards are written with status SIT_OUT (played by no one) and the board-history
 * reader can recover the bye.
 */
export function swissRoundToMaterializable(
  tables: number,
  roundNumber: number,
  boardsPerRound: number,
  seating: SwissSeating[],
  sitOutPairId: SwissPairId | null,
): MaterializableMovement {
  const { boardStart, boardEnd } = swissRoundBoardRange(
    roundNumber,
    boardsPerRound,
  );

  const tablesOut: MaterializableMovement = seating.map((seat) => ({
    tableNumber: seat.tableNumber,
    rounds: [
      {
        roundNumber,
        ns: swissPairMovementId(tables, seat.ns),
        ew: swissPairMovementId(tables, seat.ew),
        boardStart,
        boardEnd,
      },
    ],
  }));

  if (sitOutPairId != null) {
    // Park the sit-out on the next free table number so it doesn't collide with
    // a played table's PK. The board rows are flagged sitOut.
    const sitOutTable =
      seating.reduce((max, s) => Math.max(max, s.tableNumber), 0) + 1;
    tablesOut.push({
      tableNumber: sitOutTable,
      rounds: [
        {
          roundNumber,
          ns: swissPairMovementId(tables, sitOutPairId),
          ew: SWISS_SIT_OUT_PHANTOM,
          boardStart,
          boardEnd,
          sitOut: true,
        },
      ],
    });
  }

  return tablesOut;
}

/**
 * Append a single Swiss round's boards (and, for round 1, the seat assignments)
 * to a game's database, in one transaction.
 *
 * This is the incremental counterpart to the up-front materialization used by
 * static movements: Swiss draws one round at a time, so only that round's rows
 * are written. It is idempotent per round — if the round already has boards
 * (e.g. a retried draw), nothing is written and the call is a no-op — so a
 * double draw can't duplicate a round.
 *
 * Assignments are only meaningful for round 1 (they seed the initial seat map
 * consumed elsewhere); `buildSectionRows` already restricts assignment rows to
 * round 1, so later rounds contribute board rows only.
 */
export async function materializeSwissRound(
  gameId: string,
  section: SectionLetter,
  tables: number,
  roundNumber: number,
  boardsPerRound: number,
  seating: SwissSeating[],
  sitOutPairId: SwissPairId | null,
): Promise<{ written: boolean }> {
  const db = await getDb(gameId);
  if (!db) {
    throw new Error("Game db does not exist");
  }

  // Idempotency guard: bail if this round already has any board row.
  const existing = await db
    .select({ n: boards.boardNumber })
    .from(boards)
    .where(and(eq(boards.section, section), eq(boards.roundNumber, roundNumber)))
    .limit(1);

  if (existing.length > 0) {
    return { written: false };
  }

  const movement = swissRoundToMaterializable(
    tables,
    roundNumber,
    boardsPerRound,
    seating,
    sitOutPairId,
  );

  const { boardRows, assignmentRows } = buildSectionRows(section, movement);

  insertRows(db, boardRows, assignmentRows);

  return { written: true };
}

/**
 * Insert board and assignment rows in a single transaction. Mirrors the private
 * insert used by the static materializer; kept local so the Swiss path owns its
 * own transaction without widening the static module's surface.
 */
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
