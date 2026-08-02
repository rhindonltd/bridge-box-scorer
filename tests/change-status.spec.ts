import { test, expect } from "./fixtures/director-fixture";

/**
 * Change Status E2E Tests
 *
 * Tests the game status change page accessible from the director menu.
 * Verifies status options are displayed, active status is visually
 * distinguished, and status transitions redirect back to the menu.
 *
 * Note: Games created via the UI form default to JOINABLE status.
 */

test.describe("Change Status", () => {
  test("displays three status options", async ({ directorContext }) => {
    const { page, gameId } = directorContext;

    await page.goto(`/manage/${gameId}/change-status`);

    await expect(page.getByRole("button", { name: "Created" })).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByRole("button", { name: "Open for Players" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Complete" })).toBeVisible();
  });

  test("active status is visually distinguished", async ({
    directorContext,
  }) => {
    const { page, gameId } = directorContext;

    await page.goto(`/manage/${gameId}/change-status`);

    // Games created via the form default to JOINABLE status,
    // so "Open for Players" should have the active styling (bg-blue-600 text-white)
    const activeButton = page.getByRole("button", { name: "Open for Players" });
    await expect(activeButton).toBeVisible({ timeout: 10000 });

    const hasActiveClass = await activeButton.evaluate((el) =>
      el.classList.contains("bg-blue-600"),
    );
    expect(hasActiveClass).toBe(true);

    // Verify an inactive button has the inactive styling (bg-gray-200)
    const inactiveButton = page.getByRole("button", { name: "Created" });
    const hasInactiveClass = await inactiveButton.evaluate((el) =>
      el.classList.contains("bg-gray-200"),
    );
    expect(hasInactiveClass).toBe(true);
  });

  test("tapping Complete transitions and navigates back", async ({
    directorContext,
  }) => {
    const { page, gameId } = directorContext;

    await page.goto(`/manage/${gameId}/change-status`);

    // Game starts as JOINABLE, so clicking "Complete" is a valid transition
    await expect(page.getByRole("button", { name: "Complete" })).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole("button", { name: "Complete" }).click();

    // After successful status change, the page redirects to the menu
    await expect(page).toHaveURL(`/manage/${gameId}/menu`, { timeout: 10000 });
  });

  test("tapping Created on a JOINABLE game updates status", async ({
    directorContext,
  }) => {
    const { page, gameId } = directorContext;

    // Game starts as JOINABLE from creation
    await page.goto(`/manage/${gameId}/change-status`);

    await expect(page.getByRole("button", { name: "Created" })).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole("button", { name: "Created" }).click();

    // After successful status change, the page redirects to the menu
    await expect(page).toHaveURL(`/manage/${gameId}/menu`, { timeout: 10000 });
  });
});
