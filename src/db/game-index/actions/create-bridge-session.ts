"use server";

import { getDb } from "@/db/game-index";
import { BridgeSession, sessions } from "@/db/game-index/schema";

export async function createBridgeSession(data: BridgeSession) {
  const db = await getDb();
  await db.insert(sessions).values(data);
}
