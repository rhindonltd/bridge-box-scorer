"use server";

import { getDb } from "@/db/games/pairs";
import { pairs } from "@/db/games/pairs/schema";
import { NewPair } from "@/db/games/pairs/tables/pairs";

export async function createPair(
  gameId: string,
  pair: NewPair,
): Promise<number> {
  const db = await getDb(gameId);

  const inserted = await db
    .insert(pairs)
    .values(pair)
    .returning({ id: pairs.id });

  return inserted[0].id;
}
