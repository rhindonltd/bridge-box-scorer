import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { getDb } from "@/db";

export async function runMigrations() {
  const db = await getDb();
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations complete");
}

// Run if called directly
if (require.main === module) {
  runMigrations().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
}
