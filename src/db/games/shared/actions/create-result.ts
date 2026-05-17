"use server";

import {
  Result,
  results,
} from "@/db/games/shared/tables/results";
import { getDb } from "@/db/games";

export async function createResult(gameId: string, item: Result) {
  const db = await getDb(gameId);
  await db.insert(results).values(item);
}
