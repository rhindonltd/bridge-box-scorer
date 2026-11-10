import fs from "node:fs";
import { test, expect } from "@playwright/test";
import { E2E_CLOUD_SYNC_STATUS_FILE } from "../e2e-env";
import { unlockSettings } from "../fixtures/settings";
import { newParticipant } from "./support";

/**
 * Cloud Backup settings screen.
 *
 * The screen shows the box's last-sync status, which the box's own sync job
 * writes to a file; the E2E server reads a file in the throwaway data dir
 * instead (CLOUD_SYNC_STATUS_PATH, see tests/e2e-env.ts), so each test writes
 * the status it wants. "Back up now" runs a privileged host helper, so those
 * tests intercept the request in the browser: they check what the screen sends
 * and how it reacts, and never reach the server (nothing is ever triggered on
 * the machine running the tests).
 */
type Job = {
  last_success: string | null;
  last_attempt: string | null;
  last_result: string | null;
};
const NEVER: Job = {
  last_success: null,
  last_attempt: null,
  last_result: null,
};

function writeStatus(status: { enabled: boolean; backup?: Job; logs?: Job }) {
  fs.writeFileSync(
    E2E_CLOUD_SYNC_STATUS_FILE,
    JSON.stringify({ backup: NEVER, logs: NEVER, ...status }),
  );
}
const minutesAgo = (m: number) =>
  new Date(Date.now() - m * 60_000).toISOString();

test.describe("Cloud Backup settings", () => {
  test.beforeEach(() => {
    fs.rmSync(E2E_CLOUD_SYNC_STATUS_FILE, { force: true });
  });
  test.afterAll(() => {
    fs.rmSync(E2E_CLOUD_SYNC_STATUS_FILE, { force: true });
  });

  async function open(
    browser: import("@playwright/test").Browser,
    request: import("@playwright/test").APIRequestContext,
  ) {
    const page = await newParticipant(browser);
    await unlockSettings(page, request);
    await page.goto("/settings/cloud-sync");
    return page;
  }

  test("is reachable from the settings menu", async ({ browser, request }) => {
    const page = await newParticipant(browser);
    try {
      await unlockSettings(page, request);
      await page.goto("/settings");
      await page.getByRole("link", { name: "Cloud Backup" }).click();
      await expect(page).toHaveURL(/\/settings\/cloud-sync$/);
      await expect(page.getByText("Cloud Backup").first()).toBeVisible();
    } finally {
      await page.context().close();
    }
  });

  test("a box that is not cloud-enabled says so and offers no backup button", async ({
    browser,
    request,
  }) => {
    // No status file at all.
    const page = await open(browser, request);
    try {
      await expect(
        page.getByText(/Cloud backup is not enabled on this box/),
      ).toBeVisible({ timeout: 15000 });
      await expect(
        page.getByRole("button", { name: "Back up now" }),
      ).toHaveCount(0);
    } finally {
      await page.context().close();
    }
  });

  test("a corrupt status file degrades to 'not enabled' instead of erroring", async ({
    browser,
    request,
  }) => {
    fs.writeFileSync(E2E_CLOUD_SYNC_STATUS_FILE, "{ this is not json");
    const page = await open(browser, request);
    try {
      await expect(
        page.getByText(/Cloud backup is not enabled on this box/),
      ).toBeVisible({ timeout: 15000 });
    } finally {
      await page.context().close();
    }
  });

  test("an enabled box that has never backed up shows 'Not yet'", async ({
    browser,
    request,
  }) => {
    writeStatus({ enabled: true });
    const page = await open(browser, request);
    try {
      await expect(page.getByText("Games backed up")).toBeVisible({
        timeout: 15000,
      });
      await expect(page.getByText("Not yet")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Back up now" }),
      ).toBeEnabled();
    } finally {
      await page.context().close();
    }
  });

  test("shows when games were last backed up", async ({ browser, request }) => {
    writeStatus({
      enabled: true,
      backup: {
        last_success: minutesAgo(3),
        last_attempt: minutesAgo(3),
        last_result: "ok",
      },
    });
    const page = await open(browser, request);
    try {
      await expect(page.getByText("3 minutes ago")).toBeVisible({
        timeout: 15000,
      });
      // A good last run raises no warning.
      await expect(page.getByRole("status")).toHaveCount(0);
    } finally {
      await page.context().close();
    }
  });

  for (const [result, warning] of [
    ["offline", /the box was offline/],
    ["not_entitled", /isn.t included in this subscription/],
    ["error", /Last backup didn.t complete\. It will retry/],
  ] as const) {
    test(`a last run that ended '${result}' shows a gentle warning`, async ({
      browser,
      request,
    }) => {
      writeStatus({
        enabled: true,
        backup: {
          last_success: minutesAgo(120),
          last_attempt: minutesAgo(1),
          last_result: result,
        },
      });
      const page = await open(browser, request);
      try {
        await expect(page.getByRole("status")).toContainText(warning, {
          timeout: 15000,
        });
        // The last good backup is still reported alongside it.
        await expect(page.getByText("2 hours ago")).toBeVisible();
      } finally {
        await page.context().close();
      }
    });
  }

  test("'Back up now' sends the admin token, confirms, and is briefly disabled", async ({
    browser,
    request,
  }) => {
    writeStatus({ enabled: true });
    const page = await newParticipant(browser);
    let seen: { method: string; token: string | undefined } | null = null;
    await page.route("**/api/system/cloud-sync", (route) => {
      seen = {
        method: route.request().method(),
        token: route.request().headers()["x-admin-token"],
      };
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          result: { message: "Cloud sync started" },
        }),
      });
    });
    try {
      await unlockSettings(page, request);
      await page.goto("/settings/cloud-sync");
      await page.getByRole("button", { name: "Back up now" }).click();
      await expect(page.getByText("✅ Backup started")).toBeVisible({
        timeout: 15000,
      });
      expect(seen).toMatchObject({ method: "POST" });
      expect(seen!.token).toBeTruthy();
      // Debounced so it can't be hammered.
      await expect(
        page.getByRole("button", { name: "Backing up..." }),
      ).toBeDisabled();
    } finally {
      await page.context().close();
    }
  });

  test("an expired admin session sends the user back to the admin key prompt", async ({
    browser,
    request,
  }) => {
    writeStatus({ enabled: true });
    const page = await newParticipant(browser);
    await page.route("**/api/system/cloud-sync", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ success: false, error: "Unauthorized" }),
      }),
    );
    try {
      await unlockSettings(page, request);
      await page.goto("/settings/cloud-sync");
      await page.getByRole("button", { name: "Back up now" }).click();
      // The rejected token is dropped, so the settings gate closes again and
      // the admin key is asked for.
      await expect(
        page.getByRole("heading", { name: "Admin Access" }),
      ).toBeVisible({
        timeout: 15000,
      });
    } finally {
      await page.context().close();
    }
  });
});
