import "server-only";

import { getDb } from "@/db/game-index";
import { BridgeGame, games } from "../schema";
import { desc, isNull } from "drizzle-orm";

/**
 * Returns all OPEN (not finalised) games, most recently created first.
 * Used by the "Manage Games" screen. Finalised games move to "Export Game".
 */
export async function findAllGames(): Promise<BridgeGame[]> {
  const db = getDb();
  return db
    .select()
    .from(games)
    .where(isNull(games.finalisedAt))
    .orderBy(desc(games.createdAt));
}
