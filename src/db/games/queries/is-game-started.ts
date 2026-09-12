import { getDb } from "@/db/games";
import { boards } from "@/db/games/tables/boards";

/**
 * Whether a game has been started. "Started" is not a stored flag; it is
 * derived from whether the movement has been materialized — i.e. whether any
 * `boards` rows exist. Boards (and assignments) are created only by
 * `startGame`, so their presence is the canonical "the game is underway" signal
 * (mirroring the double-materialization guard in the start service).
 *
 * Returns false when the per-game database does not exist yet.
 */
export async function isGameStarted(gameId: string): Promise<boolean> {
  const db = await getDb(gameId);

  if (!db) {
    return false;
  }

  const existing = await db
    .select({ n: boards.boardNumber })
    .from(boards)
    .limit(1);

  return existing.length > 0;
}
