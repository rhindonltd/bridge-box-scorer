"use server";

import { getDb } from "@/db";
import { Movement, movements } from "@/db/schema";

export async function createMovement(item: Movement) {
  const db = await getDb();
  await db.insert(movements).values(item);
}
