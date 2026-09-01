import { test as base, expect, Page } from "@playwright/test";

export interface GameFixture {
  gameId: string;
  eventName: string;
  directorToken: string;
}

/**
 * Creates a game through the UI form, which triggers Socket.IO internally
 * and stores the director token in localStorage.
 *
 * @param page - Playwright page instance
 * @param eventName - Name for the event
 * @param tables - Number of tables (defaults to 2)
 */
export async function createGameViaUI(
  page: Page,
  eventName: string,
  tables: number = 2,
): Promise<GameFixture> {
  await page.goto("/create");
  await page.getByLabel("Event Name").fill(eventName);
  await page.getByLabel("Director Name").fill("E2E Director");

  // Set tables count by clicking the "+" button (starts at 1)
  const incrementButton = page.getByRole("button", { name: "+" });
  for (let i = 1; i < tables; i++) {
    await incrementButton.click();
  }

  // Submit the form — triggers Socket.IO create-game, stores directorToken in localStorage
  await page.getByRole("button", { name: "Create Game", exact: true }).click();

  // Wait for redirect to /create/[id]
  await page.waitForURL(/\/create\/.+/);
  const url = page.url();
  const gameId = url.split("/create/")[1];

  // Extract director token from localStorage
  const directorToken = await page.evaluate(
    (gid) => localStorage.getItem(`director:${gid}`),
    gameId,
  );

  return { gameId, eventName, directorToken: directorToken! };
}

export const test = base.extend<{ gameFixture: GameFixture }>({
  gameFixture: async ({ page }, use) => {
    const fixture = await createGameViaUI(page, `E2E Test ${Date.now()}`);
    await use(fixture);

    // Cleanup: delete the game via UI
    try {
      await page.goto(`/manage/${fixture.gameId}/menu`);
      await page
        .getByRole("button", { name: "Delete Game" })
        .click({ timeout: 5000 });
      await page
        .getByRole("button", { name: "Yes, Delete Game" })
        .click({ timeout: 5000 });
      await page.waitForURL(/\/manage\/select-game/, { timeout: 5000 });
    } catch {
      // Ignore cleanup errors (game may already be deleted by the test)
    }
  },
});

export { expect };
