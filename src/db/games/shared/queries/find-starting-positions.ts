"use server";

import { getDb as individualDb } from "@/db/games/individual";
import { getDb as pairDb } from "@/db/games/pairs";
import {
  StartingPosition,
  startingpositions,
} from "@/db/games/shared/tables/starting-positions";
import { GameType } from "@/db/games/types/game-type";

export async function findStartingPositions(
  gameType: GameType,
  gameId: string,
): Promise<StartingPosition[]> {
  const db = await (gameType == "INDIVIDUAL"
    ? individualDb(gameId)
    : pairDb(gameId));

  return db.select().from(startingpositions);
}
