import "server-only";

import Database from "better-sqlite3";

/**
 * Shared SQLite "open a database" helper.
 *
 * Every database in the app — the game-index, the per-game databases (created
 * dynamically at runtime), players and system/settings — MUST be opened through
 * this helper so they all inherit the same durability settings and are tracked
 * centrally for graceful shutdown.
 *
 * Durability rationale (see scorer-app-improvements.md):
 * the appliance can lose power mid-write. WAL mode plus `synchronous = NORMAL`
 * greatly reduces the corruption risk from power loss and improves concurrent
 * read/write behaviour, while `busy_timeout` avoids spurious "database is
 * locked" errors under concurrent access.
 */

/** Central registry of every open connection, used by graceful shutdown. */
const openConnections = new Set<Database.Database>();

/**
 * Open a SQLite database file with the app's standard resilient PRAGMAs and
 * register it for shutdown handling.
 *
 * - `journal_mode = WAL`      — write-ahead logging, resilient to power loss
 * - `synchronous = NORMAL`    — safe with WAL, far fewer fsyncs than FULL
 * - `busy_timeout = 5000`     — wait up to 5s for a lock instead of erroring
 */
export function openDatabase(dbFile: string): Database.Database {
  const sqlite = new Database(dbFile);

  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("busy_timeout = 5000");

  openConnections.add(sqlite);

  // Keep the registry tidy if a caller closes a connection directly.
  const originalClose = sqlite.close.bind(sqlite);
  sqlite.close = () => {
    openConnections.delete(sqlite);
    return originalClose();
  };

  return sqlite;
}

/**
 * Checkpoint the WAL and close every open database connection.
 *
 * Called from the process signal handlers (SIGINT/SIGTERM) so that a
 * `pm2 reload`, reboot or power-down leaves no dangling `-wal`/`-shm` files and
 * no half-written transactions. Best-effort and idempotent: individual failures
 * are logged but never prevent the remaining connections from closing.
 */
export function closeAllDatabases(): void {
  for (const sqlite of [...openConnections]) {
    try {
      // TRUNCATE folds the WAL back into the main db file and resets it, so the
      // on-disk .db is fully up to date and the -wal file does not keep growing.
      sqlite.pragma("wal_checkpoint(TRUNCATE)");
    } catch (err) {
      console.error("WAL checkpoint failed during shutdown:", err);
    }

    try {
      sqlite.close();
    } catch (err) {
      console.error("Failed to close a database during shutdown:", err);
    }

    openConnections.delete(sqlite);
  }
}

/** Number of currently-open connections (exposed for tests/diagnostics). */
export function openConnectionCount(): number {
  return openConnections.size;
}
