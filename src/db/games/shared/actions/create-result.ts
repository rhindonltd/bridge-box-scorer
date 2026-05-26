"use server";

import { Result, results } from "@/db/games/shared/tables/results";
import { getDb as individualDb } from "@/db/games/individual";
import { getDb as pairDb } from "@/db/games/pairs";
import { GameType } from "@/db/games/types/game-type";

export async function createResult(
  gameType: GameType,
  gameId: string,
  item: Result,
) {
  const db = await (gameType == "INDIVIDUAL"
    ? individualDb(gameId)
    : pairDb(gameId));
  await db.insert(results).values(item);
}
