"use server";

import { getDb as individualDb } from "@/db/games/individual";
import { getDb as pairDb } from "@/db/games/pairs";
import {
  startingpositions,
  StartingPosition,
} from "@/db/games/shared/tables/starting-positions";
import { GameType } from "@/db/games/types/game-type";

export async function createStartingPosition(
  gameType: GameType,
  gameId: string,
  data: StartingPosition,
) {
  const db = await (gameType == "INDIVIDUAL"
    ? individualDb(gameId)
    : pairDb(gameId));
  await db.insert(startingpositions).values(data);
}
