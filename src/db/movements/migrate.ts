import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { getDb } from "@/db/movements";

export async function runMovementsMigrations() {
  const db = await getDb();
  await migrate(db, { migrationsFolder: "./drizzle/movements" });
  console.log("Movement migrations complete");
}

// Run if called directly
/* v8 ignore start -- CLI entry guard: only runs when executed directly via tsx, not as an imported module */
if (require.main === module) {
  runMovementsMigrations().catch((err) => {
    console.error("Movement migration failed:", err);
    process.exit(1);
  });
}
/* v8 ignore stop */
