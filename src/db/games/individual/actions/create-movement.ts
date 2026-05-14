"use server";

import { getDb } from "@/db/games";
import {
  IndividualMovement,
  individualMovements,
} from "@/db/games/individual/schema";

export async function createIndividualMovement(
  gameId: string,
  item: IndividualMovement,
) {
  const db = await getDb(gameId);
  await db.insert(individualMovements).values(item);
}
