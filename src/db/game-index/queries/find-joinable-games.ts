import "server-only";

import { getDb } from "@/db/game-index";
import { and, gte } from "drizzle-orm";
import { BridgeGame, games } from "../schema";
import { getDb as getGameDb } from "@/db/games";
import { getResultsSummary } from "@/db/games/queries/get-results-summary";

/**
 * Whether a game is "completed" — i.e. every playable board has a final
 * result. Completed games are excluded from the joinable list because there is
 * nothing left to join. Completion is not stored on the game-index record; it
 * is derived from the per-game DB via getResultsSummary().allResultsIn.
 *
 * A game with no per-game DB yet, or one that has not been started (no playable
 * boards), is treated as not completed so it stays joinable.
 */
async function isGameCompleted(gameId: string): Promise<boolean> {
  const gameDb = await getGameDb(gameId);
  if (!gameDb) {
    return false;
  }

  const summary = await getResultsSummary(gameDb);
  return summary.allResultsIn;
}

export async function findJoinableGames(): Promise<BridgeGame[]> {
  // eventDate is stored as a date-only string ("YYYY-MM-DD"), so compare
  // against today's local date in the same format.
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const db = await getDb();

  const candidates = await db
    .select()
    .from(games)
    .where(and(gte(games.eventDate, today)));

  // Exclude games that are already completed — there is nothing left to join.
  const completed = await Promise.all(
    candidates.map((game) => isGameCompleted(game.gameId)),
  );

  return candidates.filter((_, index) => !completed[index]);
}
