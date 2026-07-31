import { test, expect } from "@playwright/test";

/**
 * Main Menu Navigation E2E Tests
 *
 * Tests the home page renders correctly and all navigation
 * buttons route to the expected pages.
 */

test.describe("Main Menu Navigation", () => {
  test("home page loads with logo and navigation buttons", async ({
    page,
  }) => {
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
    await expect(
      page.getByRole("button", { name: "Settings" }),
    ).toBeVisible();
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
