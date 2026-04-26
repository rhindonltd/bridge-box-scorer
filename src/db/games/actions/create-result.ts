"use server";

import { Result, results } from "@/db/games/schema";
import { getDb } from "@/db/games";

export async function createResult(item: Result) {
  const db = await getDb();
  await db.insert(results).values(item);
}
