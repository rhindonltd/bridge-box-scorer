import "server-only";

import { getDb as getGameDb } from "@/db/games";
import { getResultsSummary } from "@/db/games/queries/get-results-summary";

/**
 * Whether a game is "completed" — i.e. every playable board has a final
 * result. Completion is not stored on the game-index record; it is derived
 * from the per-game DB via getResultsSummary().allResultsIn.
 *
 * A game with no per-game DB yet, or one that has not been started (no playable
 * boards), is treated as not completed. This is why completed games are hidden
 * from the joinable list, while not-yet-started games stay joinable.
 */
export async function isGameCompleted(gameId: string): Promise<boolean> {
  const gameDb = await getGameDb(gameId);
  if (!gameDb) {
    return false;
  }

  const summary = await getResultsSummary(gameDb);
  return summary.allResultsIn;
}
