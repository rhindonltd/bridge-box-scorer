import "server-only";

import { runMovementsMigrations } from "@/db/movements/migrate";
import { refreshMovements } from "@/db/movements/actions/refresh-movements";

/**
 * Standalone movement-catalogue refresh.
 *
 * Self-contained and idempotent: it migrates the movements database first (so a
 * freshly provisioned box with no movements.db is fine), then wipes and
 * re-seeds the movement catalogue from the committed source files
 * (PSMovements.txt / TSMovements.txt). Re-running never duplicates rows.
 *
 * Designed to run with plain `node` on the appliance — no `tsx`, no `npm` —
 * from the compiled `dist/sync-movements.js`:
 *
 *   NODE_ENV=production DATABASE_URL=/home/bridgebox/data \
 *     node -r ./scripts/allow-server-only.cjs dist/sync-movements.js
 *
 * The data directory comes from `DATABASE_URL` (default `/home/bridgebox/data`,
 * same as the app). Unlike the EBU player sync this makes NO network calls —
 * the catalogue is derived entirely from the bundled source files.
 *
 * Exit code: 0 on success, 1 on any failure (safe to retry).
 */
async function main() {
  console.log("Running movement migrations...");
  await runMovementsMigrations();

  console.log("Refreshing movement catalogue...");
  const { pairs, teams } = await refreshMovements();

  console.log(
    `✅ Movement refresh complete — ${pairs} pair movements, ${teams} team movements.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Movement refresh failed:", err);
    process.exit(1);
  });
