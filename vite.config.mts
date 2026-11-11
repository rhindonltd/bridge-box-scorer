import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// This is an ES module, so derive its directory from its own URL.
const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
      // The real `server-only` package throws when resolved in a client module
      // graph, which includes Vitest's jsdom/browser envs and Storybook. Server
      // modules guard themselves with `import "server-only"`, so alias it to a
      // no-op stub for test/story rendering. The guard still protects real
      // client bundles built by Next.js (which does not use this alias).
      "server-only": path.resolve(dirname, "./test/stubs/server-only.ts"),
    },
  },
  css: {
    postcss: path.resolve(dirname, "./postcss.config.mjs"),
  },
  test: {
    // Use a tsconfig that omits the Next.js TS plugin, which requires the
    // TypeScript compiler API that TypeScript 7 no longer ships.
    typecheck: {
      tsconfig: "./tsconfig.vitest.json",
    },
  },
});
