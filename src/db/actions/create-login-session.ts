"use server";

import { LoginSession, loginSessions } from "@/db/schema";
import { db } from "@/db";

export async function createLoginSession(data: LoginSession) {
  await db.insert(loginSessions).values(data);
}
