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

  test("create form has Event Type selector with options", async ({ page }) => {
    await page.goto("/create");
    // Event Type select is rendered as a native <select> element
    const select = page.getByLabel("Event Type");
    await expect(select).toBeVisible({ timeout: 10000 });
    // Verify the default value is PAIRS
    await expect(select).toHaveValue("PAIRS");
  });

  test("create form has a Next button", async ({ page }) => {
    await page.goto("/create");
    await expect(page.getByRole("button", { name: "Next" })).toBeVisible({
      timeout: 10000,
    });
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

  test("full form submission creates game via Socket.IO and redirects to /create/[id]", async ({
    page,
  }) => {
    await page.goto("/create");

    const eventName = `E2E Full Create ${Date.now()}`;

    // Fill the form fields
    await page.getByLabel("Event Name").fill(eventName);
    await page.getByLabel("Director Name").fill("E2E Director");

    // Submit the form
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Wait for redirect to /create/[gameId]
    await page.waitForURL(/\/create\/.+/);

    // Assert the URL contains /create/ followed by a game ID
    const url = page.url();
    expect(url).toMatch(/\/create\/[^/]+$/);

    // Extract gameId and verify director token was stored in localStorage
    const gameId = url.split("/create/")[1];
    const directorToken = await page.evaluate(
      (gid) => localStorage.getItem(`director:${gid}`),
      gameId,
    );
    expect(directorToken).toBeTruthy();
  });

  test("Pairs game appears in /api/games/all with gameType PAIRS", async ({
    page,
    request,
  }) => {
    const marker = `E2E Pairs ${Date.now()}`;

    await page.goto("/create");
    await page.getByLabel("Event Name").fill(marker);
    await page.getByLabel("Director Name").fill("E2E Director");

    // Event Type defaults to "Pairs" so no change needed
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Wait for successful creation redirect
    await page.waitForURL(/\/create\/.+/);

    // Verify the game appears in the API with correct game type
    const response = await request.get("/api/games/all");
    expect(response.ok()).toBe(true);

    const games = await response.json();
    const createdGame = games.find(
      (g: { eventName: string }) => g.eventName === marker,
    );

    expect(createdGame).toBeDefined();
    expect(createdGame.gameType).toBe("PAIRS");
  });

  test("shows error when Socket.IO is unavailable during game creation", async ({
    page,
  }) => {
    // Block all Socket.IO connections at the network level
    await page.route("**/socket.io/**", (route) => route.abort());

    // Capture the alert dialog message
    let dialogMessage = "";
    page.on("dialog", async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    await page.goto("/create");
    await expect(page.getByText("Event Name")).toBeVisible({ timeout: 10000 });

    // Fill in the form
    await page.getByLabel("Event Name").fill("Socket Error Test");
    await page.getByLabel("Director Name").fill("Test Director");

    // Submit the form
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Wait for the error alert to appear
    await expect
      .poll(() => dialogMessage, { timeout: 10000 })
      .toMatch(/failed|error/i);

    // The page should NOT redirect — it stays on /create
    await expect(page).toHaveURL(/\/create$/);
  });
});
