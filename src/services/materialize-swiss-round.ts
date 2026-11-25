import "server-only";

import { getDb } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
import { and, eq } from "drizzle-orm";
import { SectionLetter } from "@/model/participants";
import {
  buildSectionRows,
  insertSectionDrafts,
} from "@/services/materialize-movement";
import {
  swissRoundToMaterializable,
  type SwissHalfMatchMaterialization,
  type SwissPairId,
  type SwissSeating,
} from "@/modules/swiss";

/**
 * Append a single Swiss round's boards to a game's database, in one
 * transaction.
 *
 * This is the incremental counterpart to the up-front materialization used by
 * static movements: Swiss draws one round at a time, so only that round's rows
 * are written. It is idempotent per round — if the round already has boards
 * (e.g. a retried draw), nothing is written and the call is a no-op — so a
 * double draw can't duplicate a round.
 *
 * Seats are not written here: a pair's `seat_occupancy` row is created when the
 * director seats it (pre-start), and a Swiss board row carries that occupancy's
 * seat id on `ns`/`ew`.
 */
export async function materializeSwissRound(
  gameId: string,
  section: SectionLetter,
  tables: number,
  roundNumber: number,
  boardsPerRound: number,
  seating: SwissSeating[],
  sitOutPairId: SwissPairId | null,
  halfMatch: SwissHalfMatchMaterialization | null = null,
): Promise<{ written: boolean }> {
  const db = await getDb(gameId);
  if (!db) {
    throw new Error("Game db does not exist");
  }

  // Idempotency guard: bail if this round already has any board row.
  const existing = await db
    .select({ n: boards.boardNumber })
    .from(boards)
    .where(
      and(eq(boards.section, section), eq(boards.roundNumber, roundNumber)),
    )
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
    halfMatch,
  );

  const { boardRows, matchRows, anchors } = buildSectionRows(section, movement);

  insertSectionDrafts(db, matchRows, boardRows, anchors);

  return { written: true };
}
