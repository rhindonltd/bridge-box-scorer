"use server";

import { Result, results } from "@/db/schema";
import { getDb } from "@/db";

export async function createResult(item: Result) {
  const db = await getDb();
  await db.insert(results).values(item);
}
