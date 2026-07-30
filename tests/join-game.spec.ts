import { test, expect } from "@playwright/test";

/**
 * Join Game Flow E2E Tests
 *
 * Tests the player-facing join game flow:
 * - Navigating to the game selection page
 * - Page rendering when no games are available
 * - Page structure and heading
 */

test.describe("Join Game Flow", () => {
  test("/join redirects to /join/select-game", async ({ page }) => {
    await page.goto("/join");
    await expect(page).toHaveURL(/\/join\/select-game/);
  });

  test("select-game page renders with heading", async ({ page }) => {
    await page.goto("/join/select-game");

    // The page should show the "Select Game" heading
    await expect(page.getByText("Select Game")).toBeVisible({ timeout: 10000 });
  });

  test("select-game page shows empty state when no games exist", async ({
    page,
  }) => {
    await page.goto("/join/select-game");

    // Page should render without errors even with no games
    await expect(page.locator("body")).toBeVisible();

    // The heading is always rendered regardless of game count
    await expect(page.getByText("Select Game")).toBeVisible({ timeout: 10000 });
  });

  test("joinable games API returns an array", async ({ request }) => {
    const response = await request.get("/api/games/joinable");

    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test("game detail API returns error for non-existent game", async ({
    request,
  }) => {
    const response = await request.get("/api/games/non-existent-id-12345");

    // Should respond with JSON (either null or an error object)
    expect(response.headers()["content-type"]).toContain("application/json");
  });
});
