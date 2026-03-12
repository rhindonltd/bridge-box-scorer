"use server";

import { db } from "@/db";
import { sections } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function startBridgeSection(sectionId: string) {
  await db
    .update(sections)
    .set({ started: true })
    .where(eq(sections.id, sectionId));
}
