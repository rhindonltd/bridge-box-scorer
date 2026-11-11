import path from "node:path";

/**
 * The isolated environment every automated E2E run uses.
 *
 * The suite never touches a developer's (or the appliance's) real data: the
 * Playwright web server is launched against a throwaway data directory that is
 * wiped and re-provisioned at the start of each run (see
 * `src/scripts/e2e-prepare.ts`), on its own port so it can't collide with a dev
 * server on 3000. Test-side helpers that read a game's SQLite file directly, or
 * open a raw socket, import these constants instead of hardcoding paths/URLs.
 */

/** Port the E2E server listens on (distinct from the usual dev port, 3000). */
export const E2E_PORT = Number(process.env.E2E_PORT ?? 3100);

/** Base URL of the E2E server (used by `baseURL`, sockets and fetches). */
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;

/** Repository root (this file lives in `<root>/tests`). */
export const REPO_ROOT = path.resolve(__dirname, "..");

/**
 * Data directory for the run: system / game-index / players / movements DBs and
 * the admin-key file. Overridable with `E2E_DATA_DIR`, but it must look like a
 * throwaway directory — the prepare step refuses to wipe anything else.
 */
export const E2E_DATA_DIR =
  process.env.E2E_DATA_DIR ?? path.join(REPO_ROOT, ".e2e-data");

/** Per-game SQLite files live here (`<gameId>.db`). */
export const E2E_GAMES_DIR = path.join(E2E_DATA_DIR, "games");

/**
 * Where the (stand-in) box's cloud-backup status file lives. In production the
 * box's own sync job writes it under /home/bridgebox; E2E points the app at a
 * file inside the throwaway data dir instead, which tests write to put the
 * Cloud Backup screen into a known state (absent file = "not enabled").
 */
export const E2E_CLOUD_SYNC_STATUS_FILE = path.join(
  E2E_DATA_DIR,
  "cloud-sync-status.json",
);

/**
 * The environment the server, the seeder and test-side DB readers all share.
 * Spread into child-process envs; also applied to `process.env` by the
 * Playwright config so in-process helpers resolve the same directories.
 */
export const E2E_SERVER_ENV = {
  DATABASE_URL: E2E_DATA_DIR,
  DATABASE_GAMES_URL: E2E_GAMES_DIR,
  PORT: String(E2E_PORT),
  CLOUD_SYNC_STATUS_PATH: E2E_CLOUD_SYNC_STATUS_FILE,
} as const;

/** Path to a game's SQLite file in the E2E data directory. */
export function gameDbPath(gameId: string): string {
  return path.join(E2E_GAMES_DIR, `${gameId}.db`);
}
