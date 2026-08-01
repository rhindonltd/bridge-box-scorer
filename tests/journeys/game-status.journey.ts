import { test, expect } from "@playwright/test";
import {
  createGameStep,
  selectMovementStep,
  makeGameJoinableStep,
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

test("Game status transitions affect joinable list", async ({ browser }, testInfo) => {
  const deviceConfig = test.info().project.use;

  // Director context
  const directorContext = await browser.newContext(deviceConfig);
  const directorPage = await directorContext.newPage();

  // Player context
  const playerContext = await browser.newContext(deviceConfig);
  const playerPage = await playerContext.newPage();

  try {
    // Step 1: Director creates a game (starts as JOINABLE)
    const eventName = `E2E Journey - Game Status - ${Date.now()}`;
    const { gameId } = await createGameStep(directorPage, testInfo, {
      eventName,
      directorName: "E2E Director",
      tables: 2,
    });

    // Step 2: Director selects a movement
    await selectMovementStep(directorPage, testInfo, gameId, "Mitchell");

    // Step 3: Ensure game is joinable
    await makeGameJoinableStep(directorPage, testInfo, gameId);

    // Step 4: Player navigates to select-game and verifies the game appears
    await test.step("Player sees game in joinable list", async () => {
      await playerPage.goto("/join/select-game");
      await playerPage.waitForLoadState("networkidle");

      // The select-game page renders event names as buttons
      const gameButton = playerPage.getByRole("button", { name: eventName });
      await expect(gameButton).toBeVisible({ timeout: 15000 });

      await attachScreenshot(playerPage, testInfo, "Player - Game visible in joinable list");
    });

    // Step 5: Director navigates to change-status and marks game as Complete
    await test.step("Director marks game as Complete", async () => {
      await directorPage.goto(`/manage/${gameId}/change-status`);

      await expect(
        directorPage.getByRole("button", { name: "Complete" }),
      ).toBeVisible({ timeout: 10000 });

      await directorPage.getByRole("button", { name: "Complete" }).click();

      // Step 6: Verify director is redirected to the menu
      await expect(directorPage).toHaveURL(`/manage/${gameId}/menu`, {
        timeout: 10000,
      });

      await attachScreenshot(directorPage, testInfo, "Director - Game marked Complete");
    });

    // Step 7: Player refreshes the joinable game list
    await test.step("Player no longer sees game in joinable list", async () => {
      await playerPage.goto("/join/select-game");
      await playerPage.waitForLoadState("networkidle");

      // Step 8: Verify the game no longer appears
      const gameButton = playerPage.getByRole("button", { name: eventName });
      await expect(gameButton).not.toBeVisible({ timeout: 15000 });

      await attachScreenshot(playerPage, testInfo, "Player - Game removed from joinable list");
    });
  } finally {
    await playerContext.close();
    await directorContext.close();
  }
});
