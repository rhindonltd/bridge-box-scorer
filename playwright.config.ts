import { defineConfig, devices } from "@playwright/test";

import fs from "fs";
import path from "path";
import { E2E_BASE_URL, E2E_SERVER_ENV } from "./tests/e2e-env";

/**
 * Load `.env` into `process.env` for the test runner process (without adding a
 * dotenv dependency). Some fixtures resolve the data directory from
 * `DATABASE_URL` (e.g. reading the admin-key label file); the custom server
 * gets `.env` via its own launch, but the Playwright runner does not, so we
 * load it here. Existing environment variables take precedence.
 */
function loadDotEnv(): void {
  const envPath = path.resolve(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const rawLine of fs.readFileSync(envPath, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv();

/**
 * Every automated run uses an ISOLATED server + data directory (see
 * tests/e2e-env.ts): a dedicated port and a throwaway `.e2e-data` dir that the
 * web-server command wipes and re-provisions before the app boots. Force the
 * data-dir env for the runner too (overriding any `.env` value), so test-side
 * helpers that read a game's SQLite file, and the game seeder they spawn, all
 * see the same directories as the server.
 */
Object.assign(process.env, E2E_SERVER_ENV);

/**
 * Point the app's BridgeWebs client at a LOCAL mock instead of the real
 * BridgeWebs API for the whole test run. The upload is a server-side POST, so
 * it can't be intercepted in the browser; instead the app server is launched
 * with `BRIDGEWEBS_API_BASE` set here (passed through via `webServer.env`), and
 * the BridgeWebs journey starts a matching mock server on this origin (see
 * tests/fixtures/bridgewebs-mock.ts). This guarantees no test ever reaches the
 * real BridgeWebs. An operator can still override it by exporting their own
 * `BRIDGEWEBS_API_BASE` before running (e.g. to point at a sandbox).
 */
const BRIDGEWEBS_MOCK_BASE = "http://127.0.0.1:3999/cgi-bin/bwx/api.cgi";
if (process.env.BRIDGEWEBS_API_BASE === undefined) {
  process.env.BRIDGEWEBS_API_BASE = BRIDGEWEBS_MOCK_BASE;
}

/**
 * Likewise for the EBU results-submission API: the app server is launched with
 * `EBU_API_BASE` / `EBU_PARSE_USEBIO_URL` pointing at a local stand-in (see
 * tests/fixtures/ebu-mock.ts), so no test can ever submit to the real EBU. An
 * operator can still export their own values to point at a sandbox.
 */
const EBU_MOCK_ORIGIN = "http://127.0.0.1:3998";
if (process.env.EBU_API_BASE === undefined) {
  process.env.EBU_API_BASE = `${EBU_MOCK_ORIGIN}/members/api-3.1`;
}
if (process.env.EBU_PARSE_USEBIO_URL === undefined) {
  process.env.EBU_PARSE_USEBIO_URL = `${EBU_MOCK_ORIGIN}/members/api/p2p/parse-usebio-1.1.php`;
}

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./tests",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: E2E_BASE_URL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    // {
    //   name: 'chromium',
    //   use: { ...devices['Desktop Chrome'] },
    // },
    //
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },

    /* Test against mobile viewports. */
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },

    /* User journey tests — mobile device emulation */
    {
      name: "journeys-phone",
      testDir: "./tests/journeys",
      testMatch: "*.journey.ts",
      use: {
        ...devices["iPhone 12"],
        baseURL: E2E_BASE_URL,
        trace: "on-first-retry",
        screenshot: "only-on-failure",
      },
      timeout: 120_000,
      expect: { timeout: 15_000 },
      fullyParallel: false,
    },
    {
      name: "journeys-tablet",
      testDir: "./tests/journeys",
      testMatch: "*.journey.ts",
      use: {
        viewport: { width: 800, height: 1280 },
        deviceScaleFactor: 1.5,
        hasTouch: true,
        isMobile: true,
        userAgent:
          "Mozilla/5.0 (Linux; Android 11; KFTRWI) AppleWebKit/537.36 (KHTML, like Gecko) Silk/98.4.1 like Chrome/98.0.4758.136 Mobile Safari/537.36",
        baseURL: E2E_BASE_URL,
        trace: "on-first-retry",
        screenshot: "only-on-failure",
      },
      timeout: 120_000,
      expect: { timeout: 15_000 },
      fullyParallel: false,
    },
  ],

  /*
   * Provision a fresh E2E data dir, then start the BUILT app against it
   * (run `npm run build` first). The prepare step must run before the server
   * boots — the server opens its databases at start-up — so both live in the
   * one command. A fresh server per run keeps runs independent; set
   * E2E_REUSE_SERVER=1 to keep a running E2E server between iterations.
   */
  webServer: {
    command:
      "npx tsx --require ./scripts/allow-server-only.cjs src/scripts/e2e-prepare.ts && " +
      "node -r ./scripts/allow-server-only.cjs dist/server.js",
    url: `${E2E_BASE_URL}/healthz`,
    reuseExistingServer: !!process.env.E2E_REUSE_SERVER,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      ...E2E_SERVER_ENV,
      NODE_ENV: "production",
      // Point the app server's BridgeWebs client at the local mock.
      BRIDGEWEBS_API_BASE: process.env.BRIDGEWEBS_API_BASE!,
      // ...and the EBU client at its local stand-in.
      EBU_API_BASE: process.env.EBU_API_BASE!,
      EBU_PARSE_USEBIO_URL: process.env.EBU_PARSE_USEBIO_URL!,
    },
  },
});
