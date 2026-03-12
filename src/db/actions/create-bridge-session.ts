"use server";

import { db } from "@/db";
import { BridgeSession, sessions } from "@/db/schema";

export async function createBridgeSession(data: BridgeSession) {
  await db.insert(sessions).values(data);
}
