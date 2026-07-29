import path from "node:path";

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  css: {
    postcss: path.resolve(__dirname, "./postcss.config.mjs"),
  },
  test: {
    // Use a tsconfig that omits the Next.js TS plugin, which requires the
    // TypeScript compiler API that TypeScript 7 no longer ships.
    typecheck: {
      tsconfig: "./tsconfig.vitest.json",
    },
  },
});
