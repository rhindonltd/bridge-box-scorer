import "server-only";

import { getDb } from "@/db/system";
import { loginSessions, settings } from "@/db/system/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { findSetting } from "@/db/system/queries/settings";

const ADMIN_KEY_HASH = "admin_key_hash";

/** Whether an admin key has been set (factory-seeded or updated). */
export async function adminKeyExists(): Promise<boolean> {
  return (await findSetting(ADMIN_KEY_HASH)) !== null;
}

/** Stores the admin key as a bcrypt hash, replacing any existing value. */
export async function setAdminKey(key: string): Promise<void> {
  const hash = await bcrypt.hash(key, 10);

  const db = await getDb();
  await db
    .insert(settings)
    .values({
      settingKey: ADMIN_KEY_HASH,
      settingValue: hash,
    })
    .onConflictDoUpdate({
      target: settings.settingKey,
      set: { settingValue: hash },
    });
}

/** Verifies a candidate admin key against the stored hash. */
export async function verifyAdminKey(key: string): Promise<boolean> {
  const hash = await findSetting(ADMIN_KEY_HASH);
  if (!hash) return false;

  return bcrypt.compare(key, hash);
}

/** Validates that a token corresponds to an active ADMIN login session. */
export async function validateAdminToken(
  token: string | undefined | null,
): Promise<boolean> {
  if (!token) return false;

  const db = await getDb();
  const rows = await db
    .select()
    .from(loginSessions)
    .where(eq(loginSessions.token, token))
    .limit(1);

  return rows[0]?.role === "ADMIN";
}
