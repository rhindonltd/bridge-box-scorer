import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { getDb } from "@/db/game-index";

export async function runMigrations() {
  const db = await getDb();
  await migrate(db, { migrationsFolder: "./drizzle/game-index" });
  console.log("Game index migrations complete");
}

// Run if called directly
/* v8 ignore start -- CLI entry guard: only runs when executed directly via tsx, not as an imported module */
if (require.main === module) {
  runMigrations().catch((err) => {
    console.error("Game index migration failed:", err);
    process.exit(1);
  });
}
/* v8 ignore stop */
