import { test, expect } from "@playwright/test";
import { unlockSettings } from "./fixtures/settings";

/**
 * Settings Menu E2E Tests
 *
 * Tests the settings menu page that provides navigation to WiFi Settings and
 * Club Information. The settings section is gated by the device admin key; the
 * `unlockSettings` helper seeds a valid admin session token before navigating.
 */

test.describe("Settings Menu", () => {
  test("settings page loads with heading", async ({ page, request }) => {
    await unlockSettings(page, request);
    await page.goto("/settings");
    await expect(page.getByText("Settings", { exact: true })).toBeVisible({
      timeout: 10000,
    });
  });

  test("shows WiFi Settings link", async ({ page, request }) => {
    await unlockSettings(page, request);
    await page.goto("/settings");
    await expect(page.getByRole("link", { name: "WiFi Settings" })).toBeVisible(
      { timeout: 10000 },
    );
  });

  test("shows Club Information link", async ({ page, request }) => {
    await unlockSettings(page, request);
    await page.goto("/settings");
    await expect(
      page.getByRole("link", { name: "Club Information" }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("WiFi Settings navigates to /settings/wifi", async ({
    page,
    request,
  }) => {
    await unlockSettings(page, request);
    await page.goto("/settings");
    await page.getByRole("link", { name: "WiFi Settings" }).click();
    await expect(page).toHaveURL(/\/settings\/wifi/);
  });

  test("Club Information navigates to /settings/club", async ({
    page,
    request,
  }) => {
    await unlockSettings(page, request);
    await page.goto("/settings");
    await page.getByRole("link", { name: "Club Information" }).click();
    await expect(page).toHaveURL(/\/settings\/club/);
  });
});
