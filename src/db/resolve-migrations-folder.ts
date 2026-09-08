import "server-only";

import fs from "fs";
import path from "path";

/**
 * Resolve the on-disk `drizzle/<db>` migrations folder to an absolute path that
 * works regardless of the process working directory.
 *
 * Why this exists: per-game databases are migrated at runtime during game
 * creation (see `src/db/games/actions/create-game.ts`). The other databases are
 * migrated at build/prebuild time when the cwd is reliably the app root, but the
 * runtime game-creation path runs under whatever cwd the appliance's process
 * manager (PM2/systemd) launched the server with. A bare relative path like
 * `./drizzle/games` resolves against that cwd, so if the server is started from
 * anywhere other than the app/release root the migrator throws
 * "Can't find meta/_journal.json file" and game creation fails.
 *
 * The migrations ship at `<appRoot>/drizzle/<db>`. At runtime the app root is:
 *  - dev/test (tsx / vitest): `process.cwd()` is the repo root.
 *  - production bundle (`dist/server.js`): this module is bundled into
 *    `dist/server.js`, so `__dirname` is `<appRoot>/dist` and the app root is
 *    its parent.
 *
 * We therefore probe a set of candidate roots and return the first that
 * actually contains `drizzle/<db>`, falling back to the cwd-relative path so
 * behaviour is unchanged when everything is where it's expected.
 */
export function resolveMigrationsFolder(db: string): string {
  const rel = path.join("drizzle", db);

  const candidateRoots = [
    process.cwd(),
    // Bundled at dist/server.js -> app root is the parent of dist/.
    path.join(__dirname, ".."),
    // Unbundled (tsx/vitest): this file lives at src/db/ -> app root is two up.
    path.join(__dirname, "..", ".."),
  ];

  for (const root of candidateRoots) {
    const candidate = path.join(root, rel);
    if (fs.existsSync(path.join(candidate, "meta", "_journal.json"))) {
      return candidate;
    }
  }

  // Fall back to the cwd-relative path (original behaviour).
  return `./${rel}`;
}
