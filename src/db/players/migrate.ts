import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { getDb } from "@/db/players";

export async function runPlayersMigrations() {
  const db = await getDb();
  await migrate(db, { migrationsFolder: "./drizzle/players" });
  console.log("Player migration complete");
}

// Run if called directly
if (require.main === module) {
  runPlayersMigrations().catch((err) => {
    console.error("Player migration failed:", err);
    process.exit(1);
  });
}
