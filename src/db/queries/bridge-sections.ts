"use server";

import { UpcomingSection } from "@/app/api/sections/upcoming-sections/route";
import { db } from "@/db";
import { events, sections, sessions } from "@/db/schema";
import { eq, gte } from "drizzle-orm";

export async function findUpcomingBridgeSections(): Promise<UpcomingSection[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return db
    .select({
      sectionId: sections.id,
      eventName: events.eventName,
      sectionName: sections.sectionName,
      sessionName: sessions.sessionName
    })
    .from(sections)
    .innerJoin(sessions, eq(sections.sessionId, sessions.id))
    .innerJoin(events, eq(sessions.eventId, events.id))
    .where(gte(events.eventDate, today.toISOString()));
}

export async function getSectionsForSession(sessionId: string) {
  return db
    .select()
    .from(sections)
    .where(eq(sections.sessionId, sessionId))
    .orderBy(sections.sectionName);
}
