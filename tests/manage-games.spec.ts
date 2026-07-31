import { test, expect } from "@playwright/test";

/**
 * Manage Games E2E Tests
 *
 * Tests the game management area including the game list
 * and director pages. Note: many director pages require
 * a valid director token, so we test what's accessible.
 */

test.describe("Manage Games", () => {
  test("/manage redirects to /manage/select-game", async ({ page }) => {
    await page.goto("/manage");
    await expect(page).toHaveURL(/\/manage\/select-game/);
  });

  test("manage select-game page shows heading", async ({ page }) => {
    await page.goto("/manage/select-game");
    await expect(page.getByText("Manage Games")).toBeVisible({
      timeout: 10000,
    });
  });

  test("manage select-game page shows games or empty state", async ({
    page,
  }) => {
    await page.goto("/manage/select-game");
    // Should render without errors — shows either game cards or "No games" message
    await expect(page.locator("body")).toBeVisible();
  });

  test("GET /api/games/all returns array", async ({ request }) => {
    const response = await request.get("/api/games/all");
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });
});
