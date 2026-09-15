import "server-only";

import path from "path";

/**
 * Resolves the directory that holds the appliance's data files (the SQLite
 * databases and the one-time plaintext admin-key label file). Mirrors the
 * resolution used by the system DB (`process.env.DATABASE_URL`, falling back to
 * the built-in appliance path) so the label file always sits next to
 * `system.db`.
 */
export function adminKeyDataDir(): string {
  return process.env.DATABASE_URL ?? "/home/bridgebox/data";
}

/**
 * Absolute (or env-relative) path to the plaintext admin-key file. This file is
 * written ONCE at factory seed time so the provisioning/labelling step can read
 * the key to print on the device label. It is not the source of truth for
 * verification — the bcrypt hash in the system DB is. Lives under the gitignored
 * data directory.
 */
export function adminKeyFilePath(): string {
  return path.join(adminKeyDataDir(), "admin-key.txt");
}
