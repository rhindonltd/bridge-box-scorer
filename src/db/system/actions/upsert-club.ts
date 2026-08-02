"use server";

import { getDb } from "@/db/system";
import { club } from "@/db/system/schema";

export async function upsertClub(name: string, clubNumber: string) {
  const db = await getDb();
  await db.insert(club).values({ id: 1, name, clubNumber }).onConflictDoUpdate({
    target: club.id,
    set: { name, clubNumber },
  });
}
