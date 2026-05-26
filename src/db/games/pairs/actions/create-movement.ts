"use server";

import { getDb } from "@/db/games/pairs";
import { movements } from "@/db/games/pairs/schema";
import { PairMovement } from "@/db/games/pairs/tables/movements";

export async function createPairMovement(gameId: string, item: PairMovement) {
  const db = await getDb(gameId);
  await db.insert(movements).values(item);
}
