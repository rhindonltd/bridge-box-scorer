// app/lib/migrate.ts
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "@/db";

export async function runMigrations() {
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations complete");
}

// Optional: run migrations if this file is executed directly
if (require.main === module) {
  runMigrations().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
}
