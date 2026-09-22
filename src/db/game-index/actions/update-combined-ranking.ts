import "server-only";

import { getDb } from "@/db/game-index";
import { games } from "@/db/game-index/schema";
import { eq } from "drizzle-orm";

/**
 * Set whether a multi-section game also produces a combined overall ranking
 * pooled across all sections. When false, sections stay separate.
 */
export async function updateCombinedRanking(
  gameId: string,
  combinedRanking: boolean,
) {
  const db = getDb();
  await db
    .update(games)
    .set({ combinedRanking })
    .where(eq(games.gameId, gameId));
}
