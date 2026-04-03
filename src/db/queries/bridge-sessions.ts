"use server";

import { getDb } from "@/db";
import { sessions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function findSessionsForEventId(eventId: string) {
  const db = await getDb();
  return db.select().from(sessions).where(eq(sessions.eventId, eventId));
}
