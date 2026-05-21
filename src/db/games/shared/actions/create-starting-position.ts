"use server";

import { getDb } from "@/db/games";
import {
  startingpositions,
  StartingPosition,
} from "@/db/games/shared/tables/starting-positions";

export async function createStartingPosition(
  gameId: string,
  data: StartingPosition,
) {
  const db = await getDb(gameId);
  await db.insert(startingpositions).values(data);
}
