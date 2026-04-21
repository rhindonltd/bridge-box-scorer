"use server";

import { BridgeEvent, events } from "@/db/game-index/schema";
import { getDb } from "@/db/game-index";

export async function createBridgeEvent(data: BridgeEvent) {
  const db = await getDb();
  await db.insert(events).values(data);
}
