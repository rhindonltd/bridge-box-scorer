import "server-only";

import { eq } from "drizzle-orm";
import { loginSessions } from "@/db/system/schema";
import { getDb } from "@/db/system";

/**
 * Invalidates a login session by deleting its row. Used for logout so a token
 * that has been cleared client-side can no longer be reused against the server.
 */
export async function deleteLoginSession(token: string): Promise<void> {
  const db = await getDb();
  await db.delete(loginSessions).where(eq(loginSessions.token, token));
}
