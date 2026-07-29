import { test, expect } from "@playwright/test";

/**
 * Smoke tests that verify core app navigation works.
 * These run against the local dev/production server at localhost:3000.
 */

test.describe("Smoke Tests", () => {
  test("main menu loads and has navigation buttons", async ({ page }) => {
    await page.goto("/");

    // Main menu should render with key navigation options
    await expect(page.locator("body")).toBeVisible();

    // Look for any interactive element — the page should not be blank
    const buttons = page.getByRole("button");
    await expect(buttons.first()).toBeVisible({ timeout: 10000 });
  });

  test("join page loads", async ({ page }) => {
    await page.goto("/join");

    // Should show something (either game list or a loading state)
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("settings page loads", async ({ page }) => {
    await page.goto("/settings/wifi");

    // WiFi settings page should render
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("API health check - GET /api/games/nonexistent returns JSON", async ({
    request,
  }) => {
    const response = await request.get("/api/games/nonexistent");

    // Should return a valid JSON response (game not found or empty)
    expect(response.headers()["content-type"]).toContain("application/json");
  });

  test("director login rejects empty password", async ({ request }) => {
    const response = await request.post("/api/director/login", {
      data: {},
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test("director login rejects wrong password", async ({ request }) => {
    const response = await request.post("/api/director/login", {
      data: { password: "wrong-password-12345" },
    });

    // Should be 401 (unauthorized) — password doesn't match
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test("protected routes redirect without auth", async ({ page }) => {
    // /create should redirect to / without a director token
    await page.goto("/create");

    // Should have been redirected away from /create
    await page.waitForURL((url) => !url.pathname.startsWith("/create"), {
      timeout: 5000,
    });
  });
});
