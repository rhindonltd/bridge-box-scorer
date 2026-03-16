"use server";

import { db } from "@/db";
import { Pair, pairs } from "@/db/schema";

export async function createPair(item: Pair) {
  await db.insert(pairs).values(item);
}
