"use server";

import { getDb } from "@/db/games";
import { Player, players } from "@/db/games/pairs/schema";

export async function createPlayer(gameId: number, item: Player) {
  const db = await getDb(gameId);
  await db.insert(players).values(item);
}
