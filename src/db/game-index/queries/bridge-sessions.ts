"use server";

import { getDb } from "@/db/game-index";
import { sessions } from "@/db/game-index/schema";
import { eq } from "drizzle-orm";

export async function findSessionsForEventId(eventId: string) {
  const db = await getDb();
  return db.select().from(sessions).where(eq(sessions.eventId, eventId));
}
