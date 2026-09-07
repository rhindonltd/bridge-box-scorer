// Compiles the custom server (server.ts + everything it imports from `@/*`)
// into a single CommonJS bundle at dist/server.js so the appliance can boot
// with plain `node` — no `tsx` and no `npm` on the start path.
//
// Design notes:
// - `--packages=external` keeps every bare package import (next, socket.io,
//   better-sqlite3, drizzle, server-only, ...) resolving from node_modules at
//   runtime. This is required: native modules like better-sqlite3 must NOT be
//   bundled (they'd break on ARM), and Next.js loads its own runtime files.
// - Only the project's own `@/*` sources are bundled in. esbuild reads the
//   path alias from tsconfig.json via `tsconfig`.
// - `server-only` stays external and still throws when required outside a Next
//   server bundle, so the runtime start command preloads
//   scripts/allow-server-only.cjs (same shim tsx used). See the `start` script.
import { build } from "esbuild";

await build({
  entryPoints: ["server.ts"],
  outfile: "dist/server.js",
  bundle: true,
  platform: "node",
  format: "cjs",
  // Target the Node major installed on the appliance (Node 24). node22 is a
  // safe floor per the spec.
  target: "node22",
  // Resolve bare packages (incl. native better-sqlite3) from node_modules at
  // runtime instead of bundling them.
  packages: "external",
  // Honour the `@/*` -> `src/*` path alias.
  tsconfig: "tsconfig.json",
  sourcemap: true,
  logLevel: "info",
});
