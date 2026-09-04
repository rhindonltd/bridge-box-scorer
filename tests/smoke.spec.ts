import { test, expect } from "@playwright/test";

/**
 * Smoke tests that verify core app navigation works.
 * These run against the local dev/production server at localhost:3000.
 */

test.describe("Smoke Tests", () => {
  test("main menu loads and has navigation links", async ({ page }) => {
    await page.goto("/");

    // Main menu should render with key navigation options (rendered as links).
    await expect(page.getByRole("link", { name: "Join Game" })).toBeVisible({
      timeout: 10000,
    });
  });

  test("join page loads", async ({ page }) => {
    await page.goto("/join");

    // Should show something (either game list or a loading state)
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("settings page loads", async ({ page }) => {
    await page.goto("/settings");

    // Settings gate (admin key entry) or menu should render — not blank.
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("API health check - GET /api/games/nonexistent returns JSON", async ({
    request,
  }) => {
    const response = await request.get("/api/games/nonexistent");

    // Should return a valid JSON response (game not found or empty)
    expect(response.headers()["content-type"]).toContain("application/json");
  });

  test("create page is accessible", async ({ page }) => {
    await page.goto("/create");
    await expect(page).toHaveURL(/\/create/);
  });
});
