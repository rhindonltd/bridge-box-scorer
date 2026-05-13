"use server";

import { NewBridgeGame, games } from "@/db/game-index/schema";
import { getDb } from "@/db/game-index";

export async function createBridgeGame(data: NewBridgeGame) {
  const db = await getDb();

  const result = await db
    .insert(games)
    .values(data)
    .returning({ gameId: games.gameId });

  return result[0]?.gameId;
}
