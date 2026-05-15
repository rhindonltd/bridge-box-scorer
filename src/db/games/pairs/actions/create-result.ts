"use server";

import { PairsResult, results } from "@/db/games/pairs/tables/results";
import { getDb } from "@/db/games";

export async function createResult(gameId: string, item: PairsResult) {
  const db = await getDb(gameId);
  await db.insert(results).values(item);
}
