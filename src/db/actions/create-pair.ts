"use server";

import { getDb } from "@/db";
import { Pair, pairs } from "@/db/schema";

export async function createPair(item: Pair) {
  const db = await getDb();
  await db.insert(pairs).values(item);
}
