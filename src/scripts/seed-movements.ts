import "server-only";

import { runMovementsMigrations } from "@/db/movements/migrate";
import { refreshMovements } from "@/db/movements/actions/refresh-movements";

/**
 * DEPRECATED: retained for backward compatibility with the `seed-movements`
 * npm script. Prefer `sync-movements.ts` (the standalone, appliance-oriented
 * entry compiled to dist/sync-movements.js).
 *
 * The former append-only seed has been replaced by the shared, idempotent
 * `refreshMovements` action: it migrates the movements database first, then
 * wipes and re-seeds the catalogue from PSMovements.txt / TSMovements.txt.
 * Re-running no longer duplicates rows.
 */
async function main() {
  try {
    await runMovementsMigrations();
    const { pairs, teams } = await refreshMovements();
    console.log(
      `✅ Seed complete — ${pairs} pair movements, ${teams} team movements.`,
    );
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
