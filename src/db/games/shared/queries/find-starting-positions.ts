"use server";

import { getDb } from "@/db/games";
import {
  StartingPosition,
  startingpositions,
} from "@/db/games/shared/tables/starting-positions";

export async function findStartingPositions(
  gameId: string,
): Promise<StartingPosition[]> {
  const db = await getDb(gameId);

  return db.select().from(startingpositions);
}
