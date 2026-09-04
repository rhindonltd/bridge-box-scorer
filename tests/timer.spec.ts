import { test, expect, Browser, Page } from "@playwright/test";

/**
 * Two-context timer E2E.
 *
 * One browser context acts as the director managing the timer via
 * /game/[id]/manage/timer; a second context is a pure display at
 * /game/[id]/display/timer. These tests assert real cross-context
 * synchronisation over Socket.IO: configuring, starting, pausing/resuming,
 * stepping phases, and breaks.
 *
 * Timing note: the timer counts down in real time, so tests use short
 * durations and assert observable display states (MM:SS, round label, PAUSED,
 * Break) with generous timeouts rather than exact remaining values.
 */

async function newContextPage(browser: Browser): Promise<Page> {
  const deviceConfig = test.info().project.use;
  const context = await browser.newContext(deviceConfig);
  return context.newPage();
}

/**
 * Create a game through the UI on the given page and return its id. Uses the
 * current /game/[id]/create flow. The director token is stored in the page's
 * localStorage as `director:{gameId}`.
 */
async function createGame(page: Page, eventName: string): Promise<string> {
  await page.goto("/create");
  await page.getByLabel("Event Name").fill(eventName);
  await page.getByLabel("Director Name").fill("E2E Director");
  await page.getByRole("button", { name: "Create Game", exact: true }).click();

  await page.waitForURL(/\/game\/.+\/create/, { timeout: 15000 });
  const match = /\/game\/([^/]+)\/create/.exec(page.url());
  if (!match) {
    throw new Error(`Unexpected create URL: ${page.url()}`);
  }
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

test.describe("Timer director + display sync", () => {
  test("director controls propagate to the display page", async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const directorPage = await newContextPage(browser);
    const displayPage = await newContextPage(browser);

    const gameId = await createGame(directorPage, `Timer Sync ${Date.now()}`);

    try {
      // --- Director configures and creates a timer ---
      await directorPage.goto(`/game/${gameId}/manage/timer`);
      await directorPage.waitForLoadState("networkidle");

      // Short durations so phase transitions are observable within the test.
      await directorPage.locator("#total-rounds").fill("3");
      await directorPage.getByLabel("Play minutes").fill("0");
      await directorPage.getByLabel("Play seconds").fill("30");
      await directorPage.getByLabel("Move minutes").fill("0");
      await directorPage.getByLabel("Move seconds").fill("10");

      await directorPage.getByRole("button", { name: "Create" }).click();

      await expect(
        directorPage.getByRole("button", { name: "Start" }),
      ).toBeVisible({ timeout: 15000 });

      // --- Display opens AFTER the timer was created and still syncs, because
      // the TimerProvider requests current state on mount (timer:requestState),
      // not because game:join replays anything. ---
      await displayPage.goto(`/game/${gameId}/display/timer`);
      await displayPage.waitForLoadState("networkidle");

      await expect(displayPage.getByText("Round 1 of 3")).toBeVisible({
        timeout: 15000,
      });
      await expect(displayPage.getByText("PAUSED")).toBeVisible({
        timeout: 15000,
      });

      // --- Director starts the timer; display should count down ---
      await directorPage.getByRole("button", { name: "Start" }).click();

      await expect(displayPage.getByText("PAUSED")).toBeHidden({
        timeout: 15000,
      });
      await expect(displayPage.getByText(/^\d{2}:\d{2}$/)).toBeVisible({
        timeout: 15000,
      });

      // --- Director pauses; display shows PAUSED again ---
      await directorPage.getByRole("button", { name: "Pause" }).click();
      await expect(displayPage.getByText("PAUSED")).toBeVisible({
        timeout: 15000,
      });
      await expect(directorPage.getByText("paused")).toBeVisible({
        timeout: 15000,
      });

      // --- Resume, then step to the next phase ---
      await directorPage.getByRole("button", { name: "Start" }).click();
      await expect(displayPage.getByText("PAUSED")).toBeHidden({
        timeout: 15000,
      });

      await directorPage.getByRole("button", { name: "Next phase" }).click();
      await expect(displayPage.getByText("Move for Round 2")).toBeVisible({
        timeout: 15000,
      });

      // --- Previous steps back into a round's play ---
      await directorPage
        .getByRole("button", { name: "Previous phase" })
        .click();
      await expect(displayPage.getByText(/Round \d of 3/)).toBeVisible({
        timeout: 15000,
      });
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await displayPage.context().close();
    }
  });

  test("a scheduled break shows the break screen on the display", async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const directorPage = await newContextPage(browser);
    const displayPage = await newContextPage(browser);

    const gameId = await createGame(directorPage, `Timer Break ${Date.now()}`);

    try {
      await directorPage.goto(`/game/${gameId}/manage/timer`);
      await directorPage.waitForLoadState("networkidle");

      await directorPage.locator("#total-rounds").fill("3");
      await directorPage.getByLabel("Play minutes").fill("0");
      await directorPage.getByLabel("Play seconds").fill("20");
      await directorPage.getByLabel("Move minutes").fill("0");
      await directorPage.getByLabel("Move seconds").fill("10");

      // Add a 2-minute break after round 1.
      await directorPage.getByRole("button", { name: "+ Add break" }).click();
      await directorPage.getByLabel("Break 1 after round").fill("1");
      await directorPage.getByLabel("Break 1 duration minutes").fill("2");

      await directorPage.getByRole("button", { name: "Create" }).click();
      await expect(
        directorPage.getByRole("button", { name: "Start" }),
      ).toBeVisible({ timeout: 15000 });

      // The display opens after creation and syncs because the TimerProvider
      // requests the current state on mount (timer:requestState).
      await displayPage.goto(`/game/${gameId}/display/timer`);
      await displayPage.waitForLoadState("networkidle");
      await expect(displayPage.getByText("Round 1 of 3")).toBeVisible({
        timeout: 15000,
      });

      // Advance one phase from the created (paused) state. The gap after
      // round 1 is a break, so the display should show the break screen.
      await directorPage.getByRole("button", { name: "Next phase" }).click();

      // The break replaces the move gap after round 1.
      await expect(displayPage.getByText("Break")).toBeVisible({
        timeout: 15000,
      });
      await expect(
        displayPage.getByText(/Next round starts at/),
      ).toBeVisible({ timeout: 15000 });
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await displayPage.context().close();
    }
  });
});
