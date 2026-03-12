"use server";

import { BridgeEvent, events } from "@/db/schema";
import { db } from "@/db";

export async function createBridgeEvent(data: BridgeEvent) {
  await db.insert(events).values(data);
}
