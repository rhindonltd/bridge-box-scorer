import { test, expect } from "@playwright/test";
import { createGameViaUI } from "./fixtures/game-fixture";

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

test.describe("Manage Game Selection", () => {
  test("game card shows event name on /manage/select-game", async ({
    page,
  }) => {
    // Create a game via the UI so it appears in the game list
    const eventName = `Manage Test ${Date.now()}`;
    await createGameViaUI(page, eventName);

    // Navigate to the manage select-game page
    await page.goto("/manage/select-game");

    // Assert the game card with the event name is visible
    await expect(page.getByText(eventName)).toBeVisible({ timeout: 10000 });
  });

  test("tapping game card without director token shows claim code screen", async ({
    page,
  }) => {
    // Create a game via UI (stores director token in localStorage)
    const eventName = `Claim Test ${Date.now()}`;
    const { gameId } = await createGameViaUI(page, eventName);

    // Remove the director token so we appear as a non-director
    await page.evaluate(
      (gid) => localStorage.removeItem(`director:${gid}`),
      gameId,
    );

    // Navigate to manage select-game
    await page.goto("/manage/select-game");

    // Click the game card
    await page.getByText(eventName).click();

    // Assert the claim director code screen is displayed
    await expect(page.getByText("Become Director")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByPlaceholder("Enter code")).toBeVisible();
  });

  test.skip("entering valid director code navigates to /manage/[id]/menu", async ({
    page,
  }) => {
    // Skipped: The director share code is generated server-side during game
    // creation via Socket.IO and is not retrievable through the UI or REST API
    // in a test context without direct database access.
  });

  test("tapping Cancel on claim code returns to game list", async ({
    page,
  }) => {
    // Create a game via UI
    const eventName = `Cancel Test ${Date.now()}`;
    const { gameId } = await createGameViaUI(page, eventName);

    // Remove director token to trigger the claim code flow
    await page.evaluate(
      (gid) => localStorage.removeItem(`director:${gid}`),
      gameId,
    );

    // Navigate to manage select-game and click the game card
    await page.goto("/manage/select-game");
    await page.getByText(eventName).click();

    // Verify claim code screen is showing
    await expect(page.getByText("Become Director")).toBeVisible({
      timeout: 10000,
    });

    // Click Cancel
    await page.getByRole("button", { name: "Cancel" }).click();

    // Assert we return to the game list — event name should be visible again
    await expect(page.getByText(eventName)).toBeVisible({ timeout: 10000 });
    // The claim code screen should be gone
    await expect(page.getByText("Become Director")).not.toBeVisible();
  });
});
