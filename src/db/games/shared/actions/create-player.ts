"use server";

import { getDb } from "@/db/games";
import { Player, players } from "@/db/games/shared/tables/players";

export async function createPlayer(
  gameId: string,
  item: Player,
): Promise<Player> {
  const db = await getDb(gameId);
  const result = await db.insert(players).values(item).returning();
  return result[0];
}
