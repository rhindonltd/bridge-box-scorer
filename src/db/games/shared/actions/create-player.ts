"use server";

import { getDb as individualDb } from "@/db/games/individual";
import { getDb as pairDb } from "@/db/games/pairs";
import { Player, players } from "@/db/games/shared/tables/players";
import { GameType } from "@/db/games/types/game-type";

export async function createPlayer(
  gameType: GameType,
  gameId: string,
  item: Omit<Player, "id">,
): Promise<Player> {
  const db = await (gameType == "INDIVIDUAL"
    ? individualDb(gameId)
    : pairDb(gameId));
  const result = await db.insert(players).values(item).returning();
  return result[0];
}
