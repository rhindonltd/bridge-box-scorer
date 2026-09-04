import { test, expect } from "@playwright/test";
import { unlockSettings } from "./fixtures/settings";

/**
 * Settings E2E Tests
 *
 * Tests the WiFi settings page renders its configuration UI. The settings
 * section is gated by the device admin key; `unlockSettings` seeds a valid
 * admin session token before navigating.
 */

test.describe("Settings", () => {
  test("WiFi settings page loads at /settings/wifi", async ({
    page,
    request,
  }) => {
    await unlockSettings(page, request);
    await page.goto("/settings/wifi");

    // Page should render without errors
    await expect(page.locator("body")).toBeVisible();
  });

  test("WiFi settings page shows heading", async ({ page, request }) => {
    await unlockSettings(page, request);
    await page.goto("/settings/wifi");

    await expect(page.getByText("WiFi Settings")).toBeVisible({
      timeout: 10000,
    });
  });

  test("WiFi settings page shows network selector", async ({
    page,
    request,
  }) => {
    await unlockSettings(page, request);
    await page.goto("/settings/wifi");

    // The network dropdown should be visible
    await expect(page.getByText("Network")).toBeVisible({ timeout: 10000 });
  });

  test("WiFi settings page shows password field", async ({ page, request }) => {
    await unlockSettings(page, request);
    await page.goto("/settings/wifi");

    await expect(page.getByPlaceholder("Enter WiFi password")).toBeVisible({
      timeout: 10000,
    });
  });

  test("WiFi settings page shows Test Connection button", async ({
    page,
    request,
  }) => {
    await unlockSettings(page, request);
    await page.goto("/settings/wifi");

    await expect(
      page.getByRole("button", { name: "Test Connection" }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("WiFi settings page shows Save & Apply button (disabled initially)", async ({
    page,
    request,
  }) => {
    await unlockSettings(page, request);
    await page.goto("/settings/wifi");

    const saveButton = page.getByRole("button", { name: "Save & Apply" });
    await expect(saveButton).toBeVisible({ timeout: 10000 });
    // Save should be disabled until a connection test passes
    await expect(saveButton).toBeDisabled();
  });

  test("Test Connection button is disabled without network selected", async ({
    page,
    request,
  }) => {
    await unlockSettings(page, request);
    await page.goto("/settings/wifi");

    const testButton = page.getByRole("button", { name: "Test Connection" });
    await expect(testButton).toBeVisible({ timeout: 10000 });
    // Should be disabled when no network is selected
    await expect(testButton).toBeDisabled();
  });

  test("WiFi settings page shows network dropdown placeholder", async ({
    page,
    request,
  }) => {
    await unlockSettings(page, request);
    await page.goto("/settings/wifi");

    // The dropdown should show the placeholder text
    await expect(page.getByText("-- Select WiFi --")).toBeVisible({
      timeout: 10000,
    });
  });
});
