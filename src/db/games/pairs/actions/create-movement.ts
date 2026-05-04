"use server";

import { getDb } from "@/db/games";
import { PairMovement, pairMovements } from "@/db/games/pairs/schema";

export async function createPairMovement(gameId: number, item: PairMovement) {
  const db = await getDb(gameId);
  await db.insert(pairMovements).values(item);
}
