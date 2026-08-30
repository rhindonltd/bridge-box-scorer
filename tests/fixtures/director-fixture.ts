import { test as base, expect, type Page } from "@playwright/test";

export interface DirectorContext {
  page: Page;
  gameId: string;
  eventName: string;
  directorToken: string;
}

export const test = base.extend<{ directorContext: DirectorContext }>({
  directorContext: async ({ page }, use) => {
    // Create game via UI (gets director token stored in localStorage)
    await page.goto("/create");
    const eventName = `E2E Director ${Date.now()}`;
    await page.getByLabel("Event Name").fill(eventName);
    await page.getByLabel("Director Name").fill("E2E Director");
    await page
      .getByRole("button", { name: "Create Game", exact: true })
      .click();

    // Wait for redirect to /create/[id]
    await page.waitForURL(/\/create\/.+/);

    // Extract gameId from URL
    const gameId = page.url().split("/create/")[1];

    // Extract directorToken from localStorage
    const directorToken = await page.evaluate(
      (gid) => localStorage.getItem(`director:${gid}`),
      gameId,
    );

    await use({ page, gameId, eventName, directorToken: directorToken! });

    // Cleanup: delete the game via UI
    try {
      await page.goto(`/manage/${gameId}/menu`);
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
