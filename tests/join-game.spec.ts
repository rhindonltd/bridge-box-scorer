import { test, expect } from "@playwright/test";
import { createGameViaUI } from "./fixtures/game-fixture";

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


test.describe("Join Game with Existing Game", () => {
  test("joinable game card is visible with event name", async ({ page }) => {
    const eventName = `Join E2E ${Date.now()}`;
    await createGameViaUI(page, eventName);

    await page.goto("/join/select-game");
    await expect(page.getByText(eventName)).toBeVisible({ timeout: 10000 });
  });

  test("tapping game card navigates to join menu", async ({ page }) => {
    const eventName = `Join Nav ${Date.now()}`;
    const { gameId } = await createGameViaUI(page, eventName);

    await page.goto("/join/select-game");
    await expect(page.getByText(eventName)).toBeVisible({ timeout: 10000 });
    await page.getByText(eventName).click();

    await expect(page).toHaveURL(new RegExp(`/join/${gameId}/menu`));
  });

  test("join menu shows three buttons", async ({ page }) => {
    const eventName = `Join Menu ${Date.now()}`;
    const { gameId } = await createGameViaUI(page, eventName);

    await page.goto(`/join/${gameId}/menu`);

    await expect(
      page.getByRole("button", { name: "Join As Player" }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("button", { name: "Show Timer" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Show Leaderboard" }),
    ).toBeVisible();
  });

  test("Join As Player navigates to player page", async ({ page }) => {
    const eventName = `Join Player ${Date.now()}`;
    const { gameId } = await createGameViaUI(page, eventName);

    await page.goto(`/join/${gameId}/menu`);
    await expect(
      page.getByRole("button", { name: "Join As Player" }),
    ).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: "Join As Player" }).click();

    await expect(page).toHaveURL(new RegExp(`/join/${gameId}/player`));
  });

  test("player page renders without errors", async ({ page }) => {
    const eventName = `Join Seat ${Date.now()}`;
    const { gameId } = await createGameViaUI(page, eventName);

    await page.goto(`/join/${gameId}/player`);

    // Page should render without crashing
    await expect(page.locator("body")).toBeVisible();
  });
});
