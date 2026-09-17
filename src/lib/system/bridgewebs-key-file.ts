import "server-only";

import path from "path";

/**
 * Resolves the directory that holds the appliance's data files (the SQLite
 * databases and one-off secret files). Mirrors the resolution used by the
 * system DB and the admin-key file (`process.env.DATABASE_URL`, falling back to
 * the built-in appliance path) so the key file sits next to `system.db`.
 */
export function bridgewebsKeyDataDir(): string {
  return process.env.DATABASE_URL ?? "/home/bridgebox/data";
}

/**
 * Absolute (or env-relative) path to the file holding the AES key used to
 * encrypt the stored BridgeWebs password at rest. Keeping the key in a file
 * separate from the SQLite DB means a copy of the database alone cannot decrypt
 * the password. Overridable via `BRIDGEWEBS_KEY_PATH` for tests / non-default
 * installs; otherwise it lives under the gitignored data directory.
 */
export function bridgewebsKeyFilePath(): string {
  return (
    process.env.BRIDGEWEBS_KEY_PATH ??
    path.join(bridgewebsKeyDataDir(), "bridgewebs-key.txt")
  );
}
