/**
 * postinstall: link-ts6.mjs
 *
 * TypeScript 7 drops the compiler API that typescript-eslint and ts-api-utils
 * depend on. This script creates scoped symlinks so those packages resolve
 * typescript@6 (installed as the "typescript-6" alias) from their own
 * node_modules, while the rest of the project continues to use TypeScript 7.
 *
 * This runs automatically after every `npm install` via the "postinstall"
 * package.json script.
 *
 * Packages that need TypeScript 6:
 *   - eslint-config-next/node_modules/typescript-eslint  (and transitive deps)
 *   - ts-api-utils  (peer dep: typescript >=4.8 <6)
 */

import { existsSync, lstatSync, mkdirSync, symlinkSync, unlinkSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const ts6Target = resolve(root, "node_modules", "typescript-6");

if (!existsSync(ts6Target)) {
  console.warn("[link-ts6] typescript-6 not found at", ts6Target, "— skipping");
  process.exit(0);
}

const links = [
  // typescript-eslint (bundled inside eslint-config-next) resolves typescript
  // via the eslint-config-next/node_modules scope.
  resolve(
    root,
    "node_modules",
    "eslint-config-next",
    "node_modules",
    "typescript",
  ),

  // ts-api-utils is hoisted to the top-level but also needs TypeScript <6.
  resolve(root, "node_modules", "ts-api-utils", "node_modules", "typescript"),
];

for (const linkPath of links) {
  mkdirSync(dirname(linkPath), { recursive: true });

  if (existsSync(linkPath)) {
    const stat = lstatSync(linkPath);
    if (stat.isSymbolicLink()) {
      unlinkSync(linkPath); // remove stale symlink so we can recreate
    } else {
      // A real directory was installed here — the override finally worked,
      // nothing to do.
      console.log("[link-ts6] real directory at", linkPath, "— skipping");
      continue;
    }
  }

  symlinkSync(ts6Target, linkPath, "dir");
  console.log("[link-ts6] linked", linkPath, "->", ts6Target);
}
