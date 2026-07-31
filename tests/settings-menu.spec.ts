import { test, expect } from "@playwright/test";

/**
 * Settings Menu E2E Tests
 *
 * Tests the settings menu page that provides navigation to
 * WiFi Settings and Club Information.
 */

test.describe("Settings Menu", () => {
  test("settings page loads with heading", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("Settings")).toBeVisible({ timeout: 10000 });
  });

  test("shows WiFi Settings button", async ({ page }) => {
    await page.goto("/settings");
    await expect(
      page.getByRole("button", { name: "WiFi Settings" }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("shows Club Information button", async ({ page }) => {
    await page.goto("/settings");
    await expect(
      page.getByRole("button", { name: "Club Information" }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("WiFi Settings navigates to /settings/wifi", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("button", { name: "WiFi Settings" }).click();
    await expect(page).toHaveURL(/\/settings\/wifi/);
  });

  test("Club Information navigates to /settings/club", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("button", { name: "Club Information" }).click();
    await expect(page).toHaveURL(/\/settings\/club/);
  });
});
