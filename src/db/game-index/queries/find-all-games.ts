import "server-only";

import { getDb } from "@/db/game-index";
import { BridgeGame, games } from "../schema";
import { desc } from "drizzle-orm";

/**
 * Returns all games ordered by most recently created first.
 * Used by the "Manage Games" screen to show all existing games.
 */
export async function findAllGames(): Promise<BridgeGame[]> {
  const db = getDb();
  return db.select().from(games).orderBy(desc(games.createdAt));
}
