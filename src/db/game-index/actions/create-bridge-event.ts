"use server";

import { NewBridgeEvent, events } from "@/db/game-index/schema";
import { getDb } from "@/db/game-index";

export async function createBridgeEvent(data: NewBridgeEvent) {
  const db = await getDb();
  await db.insert(events).values(data);
}
