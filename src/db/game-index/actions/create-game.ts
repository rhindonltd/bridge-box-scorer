import "server-only";

import { BridgeGame, NewBridgeGame, games } from "@/db/game-index/schema";
import { getDb } from "@/db/game-index";

export async function createBridgeGame(
  data: NewBridgeGame,
): Promise<BridgeGame> {
  const db = await getDb();
  const result = await db.insert(games).values(data).returning();
  return result[0];
}
