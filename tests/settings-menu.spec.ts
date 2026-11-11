import { test, expect } from "@playwright/test";
import { unlockSettings } from "./fixtures/settings";

/**
 * Settings Menu E2E Tests
 *
 * Tests the settings menu page that provides navigation to WiFi Settings and
 * EBU (club name, number and login). The settings section is gated by the device admin key; the
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

  test("shows an EBU link and no separate Club Information link", async ({
    page,
    request,
  }) => {
    await unlockSettings(page, request);
    await page.goto("/settings");
    await expect(
      page.getByRole("link", { name: "EBU", exact: true }),
    ).toBeVisible({ timeout: 10000 });
    // The club's name and number are set on the EBU screen.
    await expect(
      page.getByRole("link", { name: "Club Information" }),
    ).toHaveCount(0);
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

  test("EBU navigates to /settings/ebu", async ({ page, request }) => {
    await unlockSettings(page, request);
    await page.goto("/settings");
    await page.getByRole("link", { name: "EBU", exact: true }).click();
    await expect(page).toHaveURL(/\/settings\/ebu$/);
  });
});
