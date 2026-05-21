"use server";

import { getDb } from "@/db/games";
import { pairs } from "@/db/games/pairs/schema";
import { Pair } from "@/db/games/pairs/tables/pairs";

export async function createPairMovement(
  gameId: string,
  pair: Omit<Pair, "id">,
) {
  const db = await getDb(gameId);
  await db.insert(pairs).values(pair);
}
