import { runMovementsMigrations } from "@/db/movements/migrate";
import { runSystemMigrations } from "@/db/system/migrate";
import { seedAdminKey } from "@/db/system/seed-admin-key";

async function run() {
  await runMovementsMigrations();
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
