import { test, expect } from "./fixtures/director-fixture";

/**
 * Leaderboard E2E Tests
 *
 * Tests the leaderboard page rendering and the leaderboard API endpoint.
 */

test.describe("Leaderboard", () => {
  test("leaderboard page renders without errors", async ({
    directorContext,
  }) => {
    const { page, gameId } = directorContext;
    await page.goto(`/join/${gameId}/leaderboard`);

    // Page should render without crashing
    await expect(page.locator("body")).toBeVisible();
  });

  test("leaderboard API returns valid JSON", async ({
    directorContext,
    request,
  }) => {
    const { gameId } = directorContext;
    const response = await request.get(`/api/games/${gameId}/leaderboard`);

    // The API should always respond with JSON (success or error payload)
    expect(response.headers()["content-type"]).toContain("application/json");

    // Verify the response is parseable JSON
    const body = await response.json();
    expect(body).toBeDefined();
  });
});
