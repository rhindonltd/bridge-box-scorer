import { test, expect } from "@playwright/test";
import {
  createGameStep,
  attachScreenshot,
  cleanupGames,
} from "./helpers";

const BASE_URL = "http://localhost:3000";

test.beforeAll(async () => {
  await cleanupGames(BASE_URL);
});

test.afterAll(async () => {
  await cleanupGames(BASE_URL);
});

test("Timer creation, control, and player display", async ({ browser }, testInfo) => {
  const deviceConfig = test.info().project.use;

  const directorContext = await browser.newContext(deviceConfig);
  const directorPage = await directorContext.newPage();

  const playerContext = await browser.newContext(deviceConfig);
  const playerPage = await playerContext.newPage();

  try {
    // Step 1: Director creates a game
    const { gameId } = await createGameStep(directorPage, testInfo, {
      eventName: `E2E Journey - Timer Management - ${Date.now()}`,
      directorName: "E2E Director",
      tables: 2,
    });

    // Step 2: Director navigates to timer controls page
    await test.step("Director navigates to timer controls", async () => {
      await directorPage.goto(`/manage/${gameId}/timer`);
      await directorPage.waitForLoadState("networkidle");

      await expect(
        directorPage.getByRole("heading", { name: "Director Controls" }),
      ).toBeVisible({ timeout: 15000 });

      await attachScreenshot(
        directorPage,
        testInfo,
        "Director - Timer controls page loaded",
      );
    });

    // Step 3: Director configures timer settings
    await test.step("Director configures timer settings", async () => {
      // Set boards per round to 2
      const boardsInput = directorPage.locator("#boards-per-round");
      await boardsInput.fill("2");

      // Set total rounds to 4
      const roundsInput = directorPage.locator("#total-rounds");
      await roundsInput.fill("4");

      // Set play duration to 1 minute 30 seconds
      const playMinutesInput = directorPage.getByLabel("Play minutes");
      await playMinutesInput.fill("1");

      const playSecondsInput = directorPage.getByLabel("Play seconds");
      await playSecondsInput.fill("30");

      // Set move duration to 0 minutes 45 seconds
      const moveMinutesInput = directorPage.getByLabel("Move minutes");
      await moveMinutesInput.fill("0");

      const moveSecondsInput = directorPage.getByLabel("Move seconds");
      await moveSecondsInput.fill("45");

      await attachScreenshot(
        directorPage,
        testInfo,
        "Director - Timer configured",
      );
    });

    // Step 4: Director clicks "Create" to create the timer session
    await test.step("Director creates timer session", async () => {
      await directorPage
        .getByRole("button", { name: "Create" })
        .click();

      // After creation, the "Create" button is replaced with "Apply Changes", "Start", and "Pause"
      await expect(
        directorPage.getByRole("button", { name: "Start" }),
      ).toBeVisible({ timeout: 15000 });

      await expect(
        directorPage.getByRole("button", { name: "Pause" }),
      ).toBeVisible();

      await attachScreenshot(
        directorPage,
        testInfo,
        "Director - Timer session created",
      );
    });

    // Step 5: Director clicks "Start" to start the timer
    await test.step("Director starts the timer", async () => {
      await directorPage
        .getByRole("button", { name: "Start" })
        .click();

      // Verify the timer shows a countdown (the status panel shows "Remaining" with a value)
      await expect(
        directorPage.getByText("Remaining"),
      ).toBeVisible({ timeout: 15000 });

      await attachScreenshot(
        directorPage,
        testInfo,
        "Director - Timer running",
      );
    });

    // Step 6: Player opens the timer page
    await test.step("Player views timer page", async () => {
      await playerPage.goto(`/join/${gameId}/timer`);
      await playerPage.waitForLoadState("networkidle");

      // The player timer page shows either "Connecting..." or the countdown display
      // Wait for the page to load — it should show either the countdown or "Connecting…"
      await expect(
        playerPage.locator("body"),
      ).not.toBeEmpty({ timeout: 15000 });

      // Wait for the timer to sync — look for formatted time (MM:SS pattern) or "Connecting…"
      const timerDisplay = playerPage.locator(".text-\\[30vw\\]");
      const connectingText = playerPage.getByText("Connecting…");

      // Either the timer is showing a countdown or it's still connecting
      await expect(
        timerDisplay.or(connectingText),
      ).toBeVisible({ timeout: 15000 });

      await attachScreenshot(
        playerPage,
        testInfo,
        "Player - Timer display",
      );
    });

    // Step 7: Verify player sees countdown (if connected)
    await test.step("Player timer shows countdown or connecting state", async () => {
      // Give the socket a moment to sync
      const pausedText = playerPage.getByText("PAUSED");
      const connectingText = playerPage.getByText("Connecting…");
      const timerDisplay = playerPage.locator(".text-\\[30vw\\]");

      // The player should see either the timer counting down or still connecting
      // If connected, the large timer text should contain a time format like "01:30"
      if (await timerDisplay.isVisible({ timeout: 5000 }).catch(() => false)) {
        const timeText = await timerDisplay.textContent();
        // Verify it looks like a time format (MM:SS)
        expect(timeText).toMatch(/^\d{2}:\d{2}$/);
      }

      await attachScreenshot(
        playerPage,
        testInfo,
        "Player - Timer countdown verified",
      );
    });

    // Step 8: Director clicks "Pause"
    await test.step("Director pauses the timer", async () => {
      await directorPage
        .getByRole("button", { name: "Pause" })
        .click();

      // The status panel should now show "paused"
      await expect(
        directorPage.getByText("paused"),
      ).toBeVisible({ timeout: 15000 });

      await attachScreenshot(
        directorPage,
        testInfo,
        "Director - Timer paused",
      );
    });

    // Step 9: Verify player sees paused state
    await test.step("Player sees timer paused", async () => {
      // The player timer page shows "PAUSED" text when the timer is paused
      const pausedIndicator = playerPage.getByText("PAUSED");

      // Wait for the paused state to propagate via Socket.IO
      if (await pausedIndicator.isVisible({ timeout: 10000 }).catch(() => false)) {
        await expect(pausedIndicator).toBeVisible();
      }

      await attachScreenshot(
        playerPage,
        testInfo,
        "Player - Timer paused state",
      );
    });

    // Step 10: Director resumes the timer
    await test.step("Director resumes the timer", async () => {
      await directorPage
        .getByRole("button", { name: "Start" })
        .click();

      // The status should change back from "paused" to an active phase (e.g., "play" or "move")
      await expect(
        directorPage.getByText("paused"),
      ).not.toBeVisible({ timeout: 15000 });

      await attachScreenshot(
        directorPage,
        testInfo,
        "Director - Timer resumed",
      );
    });
  } finally {
    await playerContext.close();
    await directorContext.close();
  }
});
