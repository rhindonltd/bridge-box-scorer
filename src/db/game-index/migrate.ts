import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { getDb } from "@/db/game-index";

export async function runMigrations() {
  const db = await getDb();
  await migrate(db, { migrationsFolder: "./drizzle/game-index" });
  console.log("Game index migrations complete");
}

// Run if called directly
if (require.main === module) {
  runMigrations().catch((err) => {
    console.error("Game index migration failed:", err);
    process.exit(1);
  });
}
