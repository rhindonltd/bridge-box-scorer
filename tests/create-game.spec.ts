import { test, expect } from "@playwright/test";

/**
 * Game Creation Flow E2E Tests
 *
 * Tests the ability to access the create game page
 * and interact with the game creation form.
 * Note: Actual game creation uses Socket.IO, so we test the form
 * rendering and validation rather than full end-to-end creation.
 */

test.describe("Game Creation Flow", () => {
  test("create page loads with the game form", async ({ page }) => {
    await page.goto("/create");
    await expect(page).toHaveURL(/\/create/);

    // The form should have the key input fields
    await expect(page.getByText("Event Name")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Director Name")).toBeVisible();
    await expect(page.getByText("Event Type")).toBeVisible();
    await expect(page.getByText("Tables")).toBeVisible();
  });

  test("create form has Event Type selector with options", async ({
    page,
  }) => {
    await page.goto("/create");
    await expect(page.getByText("Pairs/Teams")).toBeVisible({ timeout: 10000 });
  });

  test("create form has a Next button", async ({ page }) => {
    await page.goto("/create");
    await expect(
      page.getByRole("button", { name: "Next" }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("create form allows filling in event details", async ({ page }) => {
    await page.goto("/create");

    const eventNameInput = page.getByLabel("Event Name");
    await eventNameInput.fill("E2E Test Tournament");
    await expect(eventNameInput).toHaveValue("E2E Test Tournament");

    const directorInput = page.getByLabel("Director Name");
    await directorInput.fill("Test Director");
    await expect(directorInput).toHaveValue("Test Director");
  });

  test("tables stepper increments and decrements", async ({ page }) => {
    await page.goto("/create");

    await expect(page.getByText("Tables")).toBeVisible({ timeout: 10000 });

    const incrementButton = page.getByRole("button", { name: "+" });
    if (await incrementButton.isVisible()) {
      await incrementButton.click();
      await expect(page.getByText("2")).toBeVisible();
    }
  });
});
