/**
 * Provision a fresh, throwaway data directory for an automated E2E run.
 *
 * Run by the Playwright web server command BEFORE the app server starts (the
 * server opens its databases at boot), against the directory named by
 * `DATABASE_URL` / `DATABASE_GAMES_URL`:
 *
 *   1. wipe it (refusing anything that doesn't look like a throwaway E2E dir);
 *   2. migrate every singleton database and seed the admin key;
 *   3. load the movement library (the setup screens' recommendations);
 *   4. load the fixed E2E player directory (so the join flow's EBU search
 *      resolves deterministically).
 *
 * Games themselves are NOT created here — each test seeds its own with
 * `seed-e2e-fixture.ts --json` (or builds one through the UI).
 */
import fs from "node:fs";
import path from "node:path";

import { runMigrations as runGameIndexMigrations } from "@/db/game-index/migrate";
import { runMovementsMigrations } from "@/db/movements/migrate";
import { runPlayersMigrations } from "@/db/players/migrate";
import { runSystemMigrations } from "@/db/system/migrate";
import { seedAdminKey } from "@/db/system/seed-admin-key";
import { refreshMovements } from "@/db/movements/actions/refresh-movements";
import { syncPlayers } from "@/db/players/actions/sync-ebu-players";
import { E2E_PLAYERS } from "@/scripts/e2e-seed/e2e-players";

/**
 * Only wipe a directory that is unmistakably a throwaway E2E directory, so a
 * misconfigured env can never delete real club data.
 */
export function isThrowawayDir(dir: string): boolean {
  const resolved = path.resolve(dir);
  const base = path.basename(resolved);
  return (
    base === ".e2e-data" ||
    base.startsWith("e2e-") ||
    resolved.includes(`${path.sep}.e2e-data`) ||
    resolved.startsWith(path.resolve("/tmp") + path.sep) ||
    resolved.startsWith("/private/tmp/")
  );
}

async function main() {
  const dataDir = process.env.DATABASE_URL;
  const gamesDir = process.env.DATABASE_GAMES_URL;
  if (!dataDir || !gamesDir) {
    throw new Error(
      "DATABASE_URL and DATABASE_GAMES_URL must be set (the E2E data dir).",
    );
  }
  if (!isThrowawayDir(dataDir) || !isThrowawayDir(gamesDir)) {
    throw new Error(
      `Refusing to wipe "${dataDir}": it doesn't look like a throwaway E2E ` +
        "directory (expected a .e2e-data dir, an e2e-* dir, or a path under /tmp).",
    );
  }

  fs.rmSync(dataDir, { recursive: true, force: true });
  fs.mkdirSync(gamesDir, { recursive: true });

  await runGameIndexMigrations();
  await runMovementsMigrations();
  await runPlayersMigrations();
  await runSystemMigrations();
  await seedAdminKey();
  const { pairs, teams } = await refreshMovements();
  await syncPlayers(
    E2E_PLAYERS.map((p) => ({
      ebuNumber: p.ebuNumber,
      firstName: p.firstName,
      lastName: p.lastName,
    })),
  );

  console.log(
    `E2E data ready at ${dataDir}: ${pairs} pair + ${teams} team movements, ` +
      `${E2E_PLAYERS.length} players.`,
  );
}

// Only run when executed directly (the guard keeps it importable for tests).
if (process.argv[1] && /e2e-prepare\.ts$/.test(process.argv[1])) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ E2E prepare failed:", err);
      process.exit(1);
    });
}
