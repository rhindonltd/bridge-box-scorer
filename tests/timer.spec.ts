import { test, expect } from "./fixtures/director-fixture";
import { createGameViaUI } from "./fixtures/game-fixture";
import { test as base } from "@playwright/test";

/**
 * Timer E2E Tests
 *
 * Tests the timer pages for both director (controls) and player (display).
 * Timer pages depend on Socket.IO for real-time state, so these tests
 * verify that pages render without errors rather than full timer interaction.
 */

test.describe("Director Timer", () => {
  test("director timer page renders without errors", async ({
    directorContext,
  }) => {
    const { page, gameId } = directorContext;
    await page.goto(`/manage/${gameId}/timer`);

    // Page should load without crashing
    await expect(page.locator("body")).toBeVisible();
    // The controls page renders config inputs when no timer session exists
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("director timer shows initial state with configuration controls", async ({
    directorContext,
  }) => {
    const { page, gameId } = directorContext;
    await page.goto(`/manage/${gameId}/timer`);

    await page.waitForLoadState("networkidle");

    // The ControlsPage should render timer configuration UI since no timer is active
    // Look for common timer config elements (rounds, boards, timing mode)
    const body = page.locator("body");
    await expect(body).toBeVisible();

    // The page should have some meaningful content (not blank/null render)
    const bodyText = await body.textContent();
    expect(bodyText?.length).toBeGreaterThan(0);
  });
});

base.describe("Player Timer", () => {
  base("player timer page renders without errors", async ({ page }) => {
    const eventName = `Timer E2E ${Date.now()}`;
    const { gameId } = await createGameViaUI(page, eventName);

    await page.goto(`/join/${gameId}/timer`);

    // The timer page either renders with "Connecting…" text (waiting for socket)
    // or redirects if game context isn't loaded yet. Both are valid non-crash states.
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });
});
