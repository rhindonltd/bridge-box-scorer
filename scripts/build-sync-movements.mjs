// Compiles the standalone movement-catalogue refresh (src/scripts/sync-movements.ts
// + everything it imports from `@/*`) into a single CommonJS bundle at
// dist/sync-movements.js so the appliance can run it with plain `node` — no
// `tsx` and no `npm`. Provisioning runs this to (re)seed movements.db from the
// committed movement source files.
//
// Design notes (same as build-sync-players.mjs):
// - `--packages=external` keeps every bare package import (better-sqlite3,
//   drizzle, server-only, ...) resolving from node_modules at runtime. Native
//   modules like better-sqlite3 must NOT be bundled (ARM), and this keeps the
//   bundle a thin entry over the installed deps.
// - Only the project's own `@/*` sources are bundled in (esbuild reads the path
//   alias from tsconfig.json via `tsconfig`).
// - `server-only` stays external and still throws when required outside a Next
//   server bundle, so the run command preloads scripts/allow-server-only.cjs:
//     node -r ./scripts/allow-server-only.cjs dist/sync-movements.js
//
// The movement catalogue is read at RUNTIME from PSMovements.txt / TSMovements.txt.
// `splitLinesOfFile` resolves these relative to `__dirname`, which for the
// bundled entry is `dist/`, so we copy the source files next to the bundle
// after building. This build step makes no network calls.
import { build } from "esbuild";
import { copyFileSync } from "fs";
import path from "path";

await build({
  entryPoints: ["src/scripts/sync-movements.ts"],
  outfile: "dist/sync-movements.js",
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22",
  packages: "external",
  tsconfig: "tsconfig.json",
  sourcemap: true,
  logLevel: "info",
});

// Copy the movement source files next to the bundle so the runtime
// `fs.readFileSync(path.join(__dirname, "PSMovements.txt"))` in
// src/movement/shared.ts resolves against dist/ at runtime.
for (const file of ["PSMovements.txt", "TSMovements.txt"]) {
  copyFileSync(
    path.join("src", "movement", file),
    path.join("dist", file),
  );
  console.log(`copied ${file} -> dist/${file}`);
}
