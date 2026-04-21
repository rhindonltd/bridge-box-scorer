"use server";

import { getDb } from "@/db/game-index";
import { sections } from "@/db/game-index/schema";
import { eq } from "drizzle-orm";

export async function updateGameStatus(sectionId: number, status: string) {
  const db = await getDb();
  await db.update(sections).set({ status }).where(eq(sections.id, sectionId));
}
