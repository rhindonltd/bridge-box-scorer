import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { getDb } from "@/db/system";

export async function runSystemMigrations() {
  const db = await getDb();
  await migrate(db, { migrationsFolder: "./drizzle/system" });
  console.log("System migrations complete");
}

// Run if called directly
if (require.main === module) {
  runSystemMigrations().catch((err) => {
    console.error("System migration failed:", err);
    process.exit(1);
  });
}
