import { runMigrations as runGameIndexMigrations } from "@/db/game-index/migrate";
import { runMovementsMigrations } from "@/db/movements/migrate";
import { runPlayersMigrations } from "@/db/players/migrate";
import { runSystemMigrations } from "@/db/system/migrate";
import { seedAdminKey } from "@/db/system/seed-admin-key";

async function run() {
  // Migrate every always-open singleton database. The game-index DB holds the
  // `games` table that createBridgeGame writes to on game creation, so it must
  // be migrated here — otherwise a freshly provisioned appliance throws
  // "no such table: games" the first time a game is created.
  await runGameIndexMigrations();
  await runMovementsMigrations();
  await runPlayersMigrations();
  await runSystemMigrations();

  // Factory-seed the admin key from the device MAC on first setup. Idempotent:
  // it never overwrites a key the owner has already changed.
  const seeded = await seedAdminKey();
  if (seeded) {
    console.log(`Admin key seeded from device MAC (label value): ${seeded}`);
  }
}

run()
  .then(() => {
    console.log("✅ Migrations finished successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  });
