"use server";

import { IndividualResult, results } from "@/db/games/individual/tables/results";
import { getDb } from "@/db/games";

export async function createResult(gameId: string, item: IndividualResult) {
  const db = await getDb(gameId);
  await db.insert(results).values(item);
}
