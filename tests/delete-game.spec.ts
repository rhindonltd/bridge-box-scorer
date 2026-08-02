import { test, expect } from "./fixtures/director-fixture";

/**
 * Delete Game E2E Tests
 *
 * Tests the delete game confirmation page including
 * confirmation messaging, cancel navigation, successful
 * deletion with redirect, and error handling.
 */

test.describe("Delete Game", () => {
  test("shows confirmation message with game event name", async ({
    directorContext: { page, gameId, eventName },
  }) => {
    await page.goto(`/manage/${gameId}/delete-game`);
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByText("Are you sure you want to delete"),
    ).toBeVisible();
    await expect(page.locator("strong", { hasText: eventName })).toBeVisible();
    await expect(
      page.getByText("This will permanently remove all results"),
    ).toBeVisible();
  });

  test("Cancel navigates back to menu", async ({
    directorContext: { page, gameId },
  }) => {
    await page.goto(`/manage/${gameId}/delete-game`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page).toHaveURL(`/manage/${gameId}/menu`);
  });

  test("Yes, Delete Game deletes and redirects", async ({
    directorContext: { page, gameId },
  }) => {
    await page.goto(`/manage/${gameId}/delete-game`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Yes, Delete Game" }).click();
    await expect(page).toHaveURL(/\/manage\/select-game/);
  });

  test("shows error when delete API fails", async ({
    directorContext: { page, gameId },
  }) => {
    await page.route(`**/api/games/${gameId}/delete`, (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Server error" }),
      }),
    );

    await page.goto(`/manage/${gameId}/delete-game`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Yes, Delete Game" }).click();

    await expect(page.getByText("Server error")).toBeVisible();
  });
});
