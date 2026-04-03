"use server";

import { getDb } from "@/db";
import { BridgeSession, sessions } from "@/db/schema";

export async function createBridgeSession(data: BridgeSession) {
  const db = await getDb();
  await db.insert(sessions).values(data);
}
