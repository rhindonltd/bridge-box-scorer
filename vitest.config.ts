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
          // Type-only modules: no runtime code to execute, so they cannot be
          // meaningfully unit-tested and would otherwise skew coverage.
          "src/model/leaderboard.ts",
          "src/model/traveller.ts",
          "src/timer/timer-state.ts",
          "src/scoring/plugins/types.ts",
          "src/scoring/overall/scored-traveller.ts",
          "src/scoring/traveller/pair/common.ts",
          // CLI entry scripts (run via tsx): top-level side effects on import,
          // not unit-testable as modules. Exercised by running them directly.
          "src/scripts/**",
          // Custom-server bootstrap wiring (boots Next.js + Socket.IO); not a
          // unit target.
          "src/socket/websocket.ts",
          // Next.js App Router route-entry files (page/layout/loading/error/
          // not-found). These are only exercised by a running app — server
          // rendering, routing and data fetching — so their coverage is the
          // responsibility of the Playwright journey/E2E suite (`tests/`),
          // NOT the unit/integration suite. Ordinary components under
          // src/app/** are intentionally left in the report so genuine
          // (unit-testable) gaps stay visible.
          "src/app/**/{page,layout,loading,error,not-found}.tsx",
        ],
      },

      projects: [
        {
          extends: true,
          // Note: the `server-only` -> stub alias lives in vite.config.ts so it
          // is shared by both the unit and storybook projects (and Storybook).
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
