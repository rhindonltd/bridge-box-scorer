"use server";

import { getDb } from "@/db/system";
import { club, Club } from "@/db/system/schema";

export async function findClub(): Promise<Club | null> {
  const db = await getDb();
  const result = await db.select().from(club).get();
  return result ?? null;
}
