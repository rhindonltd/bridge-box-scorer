import { getDb } from "@/db/system";
import { settings } from "@/db/system/schema";
import { eq } from "drizzle-orm";

/**
 * Dev/test helper: clears the stored admin-key hash so `seed-admin-key` can
 * regenerate a fresh key AND (re)write the plaintext label file the E2E
 * settings fixtures read. Safe to run locally; re-seeding restores a usable
 * key. Not part of the shipped app.
 */
async function main() {
  const db = await getDb();
  await db.delete(settings).where(eq(settings.settingKey, "admin_key_hash"));
  console.log("RESET_OK: cleared admin_key_hash");
  process.exit(0);
}

main().catch((err) => {
  console.error("reset failed:", err);
  process.exit(1);
});
