"use server";

import { getDb } from "@/db/games";
import {
  startingPositions,
  StartingPosition,
} from "@/db/games/shared/tables/starting-positions";

export async function createStartingPosition(
  gameId: string,
  data: StartingPosition,
) {
  const db = await getDb(gameId);
  await db.insert(startingPositions).values(data);
}
