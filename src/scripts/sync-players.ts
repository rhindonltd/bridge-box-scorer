import "server-only";

import { runPlayersMigrations } from "@/db/players/migrate";
import { syncPlayersFromEbu } from "@/db/players/actions/sync-from-ebu";

/**
 * Standalone EBU player-list sync.
 *
 * Self-contained and idempotent: it migrates the players database first (so a
 * freshly provisioned box with no players.db is fine), then downloads, parses
 * and writes the EBU player list. Designed to run with plain `node` on the
 * appliance — no `tsx`, no `npm` — from the compiled `dist/sync-players.js`:
 *
 *   NODE_ENV=production DATABASE_URL=/home/bridgebox/data \
 *     node -r ./scripts/allow-server-only.cjs dist/sync-players.js
 *
 * The data directory comes from `DATABASE_URL` (default `/home/bridgebox/data`,
 * same as the app). Requires an online window — it fetches from ebu.co.uk.
 *
 * Exit code: 0 on success, 1 on any failure (safe to retry).
 */
async function main() {
  console.log("Running player migrations...");
  await runPlayersMigrations();

  console.log("Syncing players from EBU...");
  const { count } = await syncPlayersFromEbu();

  console.log(`✅ EBU player sync complete — ${count} players.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ EBU player sync failed:", err);
    process.exit(1);
  });
