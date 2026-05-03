import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { getDb } from "@/db/movements";

export async function runMovementsMigrations() {
  const db = await getDb();
  await migrate(db, { migrationsFolder: "./drizzle/movements" });
  console.log("Movement migrations complete");
}

// Run if called directly
if (require.main === module) {
  runMovementsMigrations().catch((err) => {
    console.error("Movement migration failed:", err);
    process.exit(1);
  });
}
