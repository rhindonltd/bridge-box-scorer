import "server-only";
import { LoginSession, loginSessions } from "@/db/system/schema";
import { getDb } from "@/db/system";

export async function createLoginSession(
  data: Omit<LoginSession, "createdAt">,
) {
  const db = await getDb();
  await db
    .insert(loginSessions)
    .values({ ...data, createdAt: new Date().toISOString() });
}
