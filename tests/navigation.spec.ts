import { test, expect } from "@playwright/test";
import { createGameViaUI } from "./fixtures/game-fixture";

/**
 * Main Menu Navigation E2E Tests
 *
 * Tests the home page renders correctly and all navigation
 * buttons route to the expected pages.
 */

test.describe("Main Menu Navigation", () => {
  test("home page loads with logo and navigation buttons", async ({ page }) => {
    await page.goto("/");

    // Logo should be visible
    await expect(page.getByAltText("Bridge Box")).toBeVisible({
      timeout: 10000,
    });

    // All navigation buttons should be present
    await expect(page.getByRole("button", { name: "Join Game" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create New Game" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Manage Games" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
  });

  test("'Join Game' navigates to /join/select-game", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Join Game" }).click();
    await expect(page).toHaveURL(/\/join\/select-game/);
  });

  test("'Create New Game' navigates to /create", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Create New Game" }).click();
    await expect(page).toHaveURL(/\/create/);
  });

  test("'Manage Games' navigates to /manage", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Manage Games" }).click();
    await expect(page).toHaveURL(/\/manage/);
  });

  test("'Settings' navigates to /settings", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/settings/);
  });
});

test.describe("Back Navigation", () => {
  test("back from WiFi settings navigates to settings menu", async ({
    page,
  }) => {
    // Navigate to settings first so browser history has the parent page
    await page.goto("/settings");
    await page.goto("/settings/wifi");

    // WiFi settings page does not have a visible Back button, use browser back
    await page.goBack();
    await expect(page).toHaveURL(/\/settings$/);
  });

  test("back from Club settings navigates to settings menu", async ({
    page,
  }) => {
    // Navigate to settings first, enter PIN, then go to club
    await page.goto("/settings");
    await expect(page.getByText("Enter PIN to continue")).toBeVisible({
      timeout: 10000,
    });
    await page.getByLabel("PIN").fill("1234");
    await page.getByRole("button", { name: "Enter" }).click();
    await expect(page.getByText("Settings", { exact: true })).toBeVisible({
      timeout: 10000,
    });
    await page.getByRole("button", { name: "Club Information" }).click();
    await expect(page).toHaveURL(/\/settings\/club/);

    // Club settings page has a "Back" button that calls router.back()
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page).toHaveURL(/\/settings$/);
  });

  test("back from movement page navigates to director menu", async ({
    page,
  }) => {
    // Create a game to get a valid director context
    const { gameId } = await createGameViaUI(
      page,
      `E2E Nav Back ${Date.now()}`,
    );

    // Intercept movement API to return data so the back button renders
    await page.route(`**/api/games/${gameId}/movement`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          type: "PAIRS",
          tables: [
            {
              tableNumber: 1,
              rounds: [
                {
                  roundNumber: 1,
                  ns: "1",
                  ew: "2",
                  boardStart: 1,
                  boardEnd: 3,
                },
              ],
            },
          ],
        }),
      }),
    );

    await page.goto(`/manage/${gameId}/movement`);

    // Click the "← Back" button (aria-label="Back to movement list")
    await page.getByRole("button", { name: "Back to movement list" }).click();
    await expect(page).toHaveURL(new RegExp(`/manage/${gameId}/menu`));
  });

  test("change-status page navigates back to director menu after status change", async ({
    page,
  }) => {
    // Create a game (starts in JOINABLE status)
    const { gameId } = await createGameViaUI(
      page,
      `E2E Nav Status ${Date.now()}`,
    );

    await page.goto(`/manage/${gameId}/change-status`);

    // Click "Complete" to change status — game is JOINABLE so this triggers a real transition
    await page.getByRole("button", { name: "Complete" }).click();
    await expect(page).toHaveURL(new RegExp(`/manage/${gameId}/menu`), {
      timeout: 10000,
    });
  });
});
