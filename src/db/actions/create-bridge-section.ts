"use server";

import { getDb } from "@/db";
import { BridgeSection, sections } from "@/db/schema";

export async function createBridgeSection(item: BridgeSection) {
  const db = await getDb();
  await db.insert(sections).values(item);
}
