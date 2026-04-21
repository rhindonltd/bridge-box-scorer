"use server";

import { getDb } from "@/db/games";
import { Pair, pairs } from "@/db/games/schema";

export async function createPair(item: Pair) {
  const db = await getDb();
  await db.insert(pairs).values(item);
}
