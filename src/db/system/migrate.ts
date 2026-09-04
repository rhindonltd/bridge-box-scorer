import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { getDb } from "@/db/system";

export async function runSystemMigrations() {
  const db = await getDb();
  await migrate(db, { migrationsFolder: "./drizzle/system" });
  console.log("System migrations complete");
}

// Run if called directly
/* v8 ignore start -- CLI entry guard: only runs when executed directly via tsx, not as an imported module */
if (require.main === module) {
  runSystemMigrations().catch((err) => {
    console.error("System migration failed:", err);
    process.exit(1);
  });
}
/* v8 ignore stop */
