"use server";

import { getDb } from "@/db";
import { sections } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function startBridgeSection(sectionId: string) {
  const db = await getDb();
  await db
    .update(sections)
    .set({ started: true })
    .where(eq(sections.id, sectionId));
}
