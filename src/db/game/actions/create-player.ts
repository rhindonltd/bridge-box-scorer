"use server";

import { getDb as pairDb } from "@/db/game";
import { NewPlayer, Player, players } from "@/db/game/tables/players";
import { GameType } from "@/db/game/types/game-type";

export async function createPlayer(
  gameType: GameType,
  gameId: string,
  item: NewPlayer,
): Promise<Player> {
  const db = await pairDb(gameId);
  const result = await db.insert(players).values(item).returning();
  return result[0];
}
