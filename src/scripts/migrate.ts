import "dotenv/config";

import { runMovementsMigrations } from "@/db/movements/migrate";
import { runPlayersMigrations } from "@/db/players/migrate";

runMovementsMigrations()
  .then(() => {
    runPlayersMigrations();
  })
  .then(() => {
    console.log("✅ Migrations finished successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  });
