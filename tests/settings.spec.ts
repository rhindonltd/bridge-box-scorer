import { test, expect } from "@playwright/test";
import { enterSettingsPin } from "./fixtures/helpers";

/**
 * Settings E2E Tests
 *
 * Tests the settings page loads and renders the WiFi configuration UI.
 * Note: The settings section is gated by a PIN entry page (PIN: 1234).
 */

test.describe("Settings", () => {
  test("WiFi settings page loads at /settings/wifi", async ({ page }) => {
    await page.goto("/settings/wifi");
    await enterSettingsPin(page);

    // Page should render without errors
    await expect(page.locator("body")).toBeVisible();
  });

  test("WiFi settings page shows heading", async ({ page }) => {
    await page.goto("/settings/wifi");
    await enterSettingsPin(page);

    await expect(page.getByText("WiFi Settings")).toBeVisible({
      timeout: 10000,
    });
  });

  test("WiFi settings page shows network selector", async ({ page }) => {
    await page.goto("/settings/wifi");
    await enterSettingsPin(page);

    // The network dropdown should be visible
    await expect(page.getByText("Network")).toBeVisible({ timeout: 10000 });
  });

  test("WiFi settings page shows password field", async ({ page }) => {
    await page.goto("/settings/wifi");
    await enterSettingsPin(page);

    await expect(page.getByPlaceholder("Enter WiFi password")).toBeVisible({
      timeout: 10000,
    });
  });

  test("WiFi settings page shows Test Connection button", async ({ page }) => {
    await page.goto("/settings/wifi");
    await enterSettingsPin(page);

    await expect(
      page.getByRole("button", { name: "Test Connection" }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("WiFi settings page shows Save & Apply button (disabled initially)", async ({
    page,
  }) => {
    await page.goto("/settings/wifi");
    await enterSettingsPin(page);

    const saveButton = page.getByRole("button", { name: "Save & Apply" });
    await expect(saveButton).toBeVisible({ timeout: 10000 });
    // Save should be disabled until a connection test passes
    await expect(saveButton).toBeDisabled();
  });

  test("Test Connection button is disabled without network selected", async ({
    page,
  }) => {
    await page.goto("/settings/wifi");
    await enterSettingsPin(page);

    const testButton = page.getByRole("button", { name: "Test Connection" });
    await expect(testButton).toBeVisible({ timeout: 10000 });
    // Should be disabled when no network is selected
    await expect(testButton).toBeDisabled();
  });

  test("WiFi settings page shows network dropdown placeholder", async ({
    page,
  }) => {
    await page.goto("/settings/wifi");
    await enterSettingsPin(page);

    // The dropdown should show the placeholder text
    await expect(page.getByText("-- Select WiFi --")).toBeVisible({
      timeout: 10000,
    });
  });
});
