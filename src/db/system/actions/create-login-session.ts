"use server";

import { LoginSession, loginSessions } from "@/db/system/schema";
import { getDb } from "@/db/system";

export async function createLoginSession(data: LoginSession) {
  const db = await getDb();
  await db.insert(loginSessions).values(data);
}
