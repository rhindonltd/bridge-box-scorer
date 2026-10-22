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
          // API route handlers (`route.ts`). These are thin adapters: they
          // validate/parse the request and delegate to services/DB actions that
          // ARE unit-tested, then hand off to the shared route wrappers
          // (withBasicRoute/withDirectorRoute, themselves tested). Exercising
          // the HTTP boundary end-to-end (auth, status codes, error mapping) is
          // the job of the Playwright journey suite, so the handlers are not a
          // unit target.
          "src/app/api/**/route.ts",
          "src/app/healthz/route.ts",
          // Privileged system integrations that shell out to the appliance OS
          // (NetworkManager via nmcli, the wifi-ctl/​wifi-config helpers, the
          // reboot/recovery paths). They are I/O against the host, verified on
          // the box / by ops testing rather than mocked shell calls, which would
          // only assert the mock.
          "src/lib/system/nmcli.ts",
          "src/lib/system/wifi-ctl.ts",
          "src/lib/system/wifi-config.ts",
          "src/lib/wifi-recovery.ts",
          // Next.js client navigation side-effect wiring (subscribes to route
          // changes to maintain the in-app history stack); has no logic to
          // unit-test and only runs under a live router.
          "src/components/layout/AppNavigationTracker.tsx",
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
            // API route-handler tests (next-test-api-route-handler) construct a
            // real Next `NextRequest`, whose constructor calls
            // `signal.addEventListener` on an `AbortSignal`. Since jsdom 30.1,
            // jsdom's `EventTarget` rejects a signal that isn't one of its own
            // instances ("'addEventListener' called on an object that is not a
            // valid instance of EventTarget"), so these tests cannot run under
            // the jsdom environment. They exercise the HTTP boundary and need
            // no DOM, so they run in the `node` project below instead.
            exclude: [
              "**/node_modules/**",
              "src/app/api/**/route.test.ts",
            ],
            // Node 25+ ships Web Storage on by default, so `localStorage` /
            // `sessionStorage` exist as global accessors. Vitest's
            // `getWindowKeys` then drops jsdom's own Storage (it isn't in
            // Vitest's allowlist), leaving `window.localStorage` === undefined
            // and breaking every test that touches the token stores. Starting
            // the worker with `--no-webstorage` removes Node's global so
            // jsdom's real implementation lands normally. Guarded by major
            // version: Node 22 (and the current `.nvmrc` floor's predecessors)
            // reject the flag outright with "bad option". See
            // https://github.com/vitest-dev/vitest/issues/10867.
            execArgv:
              Number(process.versions.node.split(".")[0]) >= 25
                ? ["--no-webstorage"]
                : [],
            // The suite mixes fast unit tests with heavier `*.int.test.ts`
            // integration tests that spin up a real, freshly-migrated SQLite
            // database per test (better-sqlite3 runs its migrations and inserts
            // SYNCHRONOUSLY, blocking the worker). Under the default fork pool
            // every CPU runs such a file at once, so a DB-heavy test can be
            // starved well past the 5s default and time out — producing a
            // SHIFTING set of failures (and knock-on `UNIQUE`/`db does not
            // exist` errors when a timed-out test's teardown is skipped) that
            // never reproduces in isolation. A 20s budget clears the contention
            // headroom while still surfacing a genuinely hung test.
            testTimeout: 20000,
            hookTimeout: 20000,
          },
        },
        {
          extends: true,
          test: {
            // API route-handler tests run against real Node web globals
            // (`Request`/`Response`/`AbortSignal`) rather than jsdom's, which
            // is what `next-test-api-route-handler` + `NextRequest` require.
            // See the note on the `unit` project's `exclude` above.
            name: "unit-node",
            environment: "node",
            globals: true,
            include: ["src/app/api/**/route.test.ts"],
            testTimeout: 20000,
            hookTimeout: 20000,
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
