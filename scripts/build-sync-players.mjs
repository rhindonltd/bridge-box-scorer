// Compiles the standalone EBU player sync (src/scripts/sync-players.ts +
// everything it imports from `@/*`) into a single CommonJS bundle at
// dist/sync-players.js so the appliance can run it with plain `node` — no `tsx`
// and no `npm`. The provisioning system runs this once at first setup and on a
// timer during later online windows to keep the player list current.
//
// Design notes (same as build-server.mjs):
// - `--packages=external` keeps every bare package import (better-sqlite3,
//   drizzle, csv-parse, server-only, ...) resolving from node_modules at
//   runtime. Native modules like better-sqlite3 must NOT be bundled (ARM), and
//   this keeps the bundle a thin entry over the installed deps.
// - Only the project's own `@/*` sources are bundled in (esbuild reads the path
//   alias from tsconfig.json via `tsconfig`).
// - `server-only` stays external and still throws when required outside a Next
//   server bundle, so the run command preloads scripts/allow-server-only.cjs:
//     node -r ./scripts/allow-server-only.cjs dist/sync-players.js
// - The EBU fetch happens at RUNTIME only; this build step makes no network
//   calls, preserving the offline-build guarantee.
import { build } from "esbuild";

await build({
  entryPoints: ["src/scripts/sync-players.ts"],
  outfile: "dist/sync-players.js",
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22",
  packages: "external",
  tsconfig: "tsconfig.json",
  sourcemap: true,
  logLevel: "info",
});
