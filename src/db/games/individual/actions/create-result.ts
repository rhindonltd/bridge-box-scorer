"use server";

import { Result, results } from "@/db/games/individual/schema";
import { getDb } from "@/db/games";

export async function createResult(gameId: number, item: Result) {
  const db = await getDb(gameId);
  await db.insert(results).values(item);
}
