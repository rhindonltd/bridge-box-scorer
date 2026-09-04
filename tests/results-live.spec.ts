import { test, expect, Browser, Page } from "@playwright/test";

/**
 * Live results E2E (self-contained).
 *
 * The leaderboard and per-board traveller are socket-only, feature-scoped
 * contexts: each requests its snapshot on mount via an acknowledged event
 * (`leaderboard:requestState` / `traveller:requestState`, which also join a
 * feature room) and applies pushed snapshots on top. A shared, occupancy-gated
 * broadcaster fans out recomputed snapshots when a board result changes.
 *
 * This spec uses the current `/game/[id]/...` routes and its own game-creation
 * helper (the shared fixtures target an older route layout). It verifies the
 * socket-backed leaderboard display resolves via the request-on-mount path
 * (past its loading spinner) rather than hanging or crashing.
 */

async function newContextPage(browser: Browser): Promise<Page> {
  const deviceConfig = test.info().project.use;
  const context = await browser.newContext(deviceConfig);
  return context.newPage();
}

async function createGame(page: Page, eventName: string): Promise<string> {
  await page.goto("/create");
  await page.getByLabel("Event Name").fill(eventName);
  await page.getByLabel("Director Name").fill("E2E Director");
  await page.getByRole("button", { name: "Create Game", exact: true }).click();

  await page.waitForURL(/\/game\/.+\/create/, { timeout: 15000 });
  const match = /\/game\/([^/]+)\/create/.exec(page.url());
  if (!match) throw new Error(`Unexpected create URL: ${page.url()}`);
  return match[1];
}

async function deleteGame(page: Page, gameId: string): Promise<void> {
  try {
    await page.goto(`/game/${gameId}/manage/menu`);
    await page
      .getByRole("button", { name: "Delete Game" })
      .click({ timeout: 5000 });
    await page
      .getByRole("button", { name: "Yes, Delete Game" })
      .click({ timeout: 5000 });
  } catch {
    // Best-effort cleanup.
  }
}

test.describe("Live results displays (socket-only)", () => {
  test("leaderboard display resolves via the socket request-on-mount path", async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const directorPage = await newContextPage(browser);
    const displayPage = await newContextPage(browser);

    const gameId = await createGame(directorPage, `Live Results ${Date.now()}`);

    try {
      await displayPage.goto(`/game/${gameId}/display/leaderboard`);
      await displayPage.waitForLoadState("networkidle");

      // The context requests its snapshot on mount and resolves past the
      // loading spinner; the page header confirms the leaderboard rendered.
      await expect(
        displayPage.getByText("Leaderboard", { exact: true }),
      ).toBeVisible({ timeout: 15000 });
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await displayPage.context().close();
    }
  });
});
