import { defineConfig, mergeConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";

import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // 👇 ADD THIS BLOCK
      coverage: {
        provider: "v8",
        reporter: ["text", "html", "lcov"],
        reportsDirectory: "./coverage",
        include: ["src/**/*.{ts,tsx}"],
        exclude: [
          "node_modules/",
          ".next/",
          "coverage/",
          "**/*.d.ts",
          "**/*.config.*",
          ".storybook/**",
          "**/*.stories.*",
          "**/*.test.*",
        ],
      },

      projects: [
        {
          extends: true,
          resolve: {
            alias: {
              // The real `server-only` package throws when resolved in a
              // client module graph, which includes Vitest's jsdom env. Server
              // modules guard themselves with `import "server-only"`, so alias
              // it to a no-op stub here to allow direct unit testing. The guard
              // still protects real client bundles built by Next.js.
              "server-only": path.resolve(dirname, "./test/stubs/server-only.ts"),
            },
          },
          test: {
            name: "unit",
            environment: "jsdom",
            globals: true,
            setupFiles: ["./vitest.setup.ts"],
            include: ["src/**/*.test.{ts,tsx}"],
          },
        },
        {
          extends: true,
          plugins: [
            storybookTest({
              configDir: path.join(dirname, ".storybook"),
              storybookScript: "npm run storybook dev -p 6006",
            }),
          ],
          test: {
            name: "storybook",
            browser: {
              enabled: true,
              provider: playwright({}),
              headless: true,
              instances: [{ browser: "chromium" }],
            },
            setupFiles: ["./.storybook/vitest.setup.ts"],
          },
        },
      ],
    },
  }),
);
