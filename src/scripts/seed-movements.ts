import "server-only";

import {
  refreshCatalog,
  runCatalogMigrations,
} from "@/modules/movement-catalog/server";

/**
 * DEPRECATED: retained for backward compatibility with the `seed-movements`
 * npm script. Prefer `sync-movements.ts` (the standalone, appliance-oriented
 * entry compiled to dist/sync-movements.js).
 *
 * The former append-only seed has been replaced by the shared, idempotent
 * `refreshCatalog` action: it migrates the movements database first, then
 * wipes and re-seeds the catalogue from PSMovements.txt.
 * Re-running no longer duplicates rows.
 */
async function main() {
  try {
    await runCatalogMigrations();
    const { pairs } = await refreshCatalog();
    console.log(`✅ Seed complete — ${pairs} pair movements.`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
