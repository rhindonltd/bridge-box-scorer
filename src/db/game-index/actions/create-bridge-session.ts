"use server";

import { getDb } from "@/db/game-index";
import { NewBridgeSession, sessions } from "@/db/game-index/schema";

export async function createBridgeSession(data: NewBridgeSession) {
  const db = await getDb();
  await db.insert(sessions).values(data);
}
