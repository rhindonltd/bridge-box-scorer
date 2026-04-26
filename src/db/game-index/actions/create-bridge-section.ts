"use server";

import { getDb } from "@/db/game-index";
import { BridgeSection, sections } from "@/db/game-index/schema";

export async function createBridgeSection(item: BridgeSection) {
  const db = await getDb();
  await db.insert(sections).values(item);
}
