"use server";

import { LoginSession, loginSessions } from "@/db/schema";
import { getDb } from "@/db";

export async function createLoginSession(data: LoginSession) {
  const db = await getDb();
  await db.insert(loginSessions).values(data);
}
