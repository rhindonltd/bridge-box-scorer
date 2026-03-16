"use server";

import { Result, results } from "@/db/schema";
import { db } from "@/db";

export async function createResult(item: Result) {
  await db.insert(results).values(item);
}
