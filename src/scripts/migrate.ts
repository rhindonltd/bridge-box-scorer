import { runMigrations } from "@/db/migrate";

runMigrations()
  .then(() => {
    console.log("✅ Migrations finished successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  });
