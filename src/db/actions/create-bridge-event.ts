"use server";

import { BridgeEvent, events } from "@/db/schema";
import { getDb } from "@/db";

export async function createBridgeEvent(data: BridgeEvent) {
  const db = await getDb();
  await db.insert(events).values(data);
}
