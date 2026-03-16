"use server";

import { db } from "@/db";
import { sessions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function findSessionsForEventId(eventId: string) {
  return db.select().from(sessions).where(eq(sessions.eventId, eventId));
}
