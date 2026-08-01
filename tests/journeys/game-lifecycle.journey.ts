import { test, expect } from "@playwright/test";
import {
  createGameStep,
  selectMovementStep,
  makeGameJoinableStep,
  joinGameStep,
  enterResultStep,
  attachScreenshot,
  cleanupGames,
  deleteGameStep,
} from "./helpers";

const BASE_URL = "http://localhost:3000";

test.beforeAll(async () => {
  await cleanupGames(BASE_URL);
});

test.afterAll(async () => {
  await cleanupGames(BASE_URL);
});

test("Complete pairs game lifecycle", async ({ browser }, testInfo) => {
  const deviceConfig = test.info().project.use;

  const directorContext = await browser.newContext(deviceConfig);
  const directorPage = await directorContext.newPage();

  const player1Context = await browser.newContext(deviceConfig);
  const player1Page = await player1Context.newPage();

  const player2Context = await browser.newContext(deviceConfig);
  const player2Page = await player2Context.newPage();

  let gameId = "";

  try {
    // Step 1: Director creates game
    ({ gameId } = await createGameStep(directorPage, testInfo, {
      eventName: `E2E Journey - Game Lifecycle - ${Date.now()}`,
      directorName: "E2E Director",
      tables: 2,
    }));

    // Step 2: Director selects movement (via socket for reliability)
    await selectMovementStep(directorPage, testInfo, gameId, "Mitchell");

    // Step 3: Director makes game joinable
    await makeGameJoinableStep(directorPage, testInfo, gameId);

    // Step 4: Player 1 joins at seat 1NS
    await joinGameStep(player1Page, testInfo, gameId, {
      seat: "1NS",
      ebuNumbers: ["477484", "404476"],
    });

    // Step 5: Player 2 joins at seat 1EW
    await joinGameStep(player2Page, testInfo, gameId, {
      seat: "1EW",
      ebuNumbers: ["12269", "16671"],
    });

    // Step 6: Both players enter matching results (Pass Out for simplicity)
    await enterResultStep(player1Page, testInfo, {
      gameId,
      seat: "1NS",
      board: 1,
      passOut: true,
    });

    await enterResultStep(player2Page, testInfo, {
      gameId,
      seat: "1EW",
      board: 1,
      passOut: true,
    });

    // Step 7: Verify confirmation state
    await test.step("Both players see result confirmation", async () => {
      // After both submit matching results, they should see the board results
      // page (traveller) with a "Next Board" or "Next Round" button,
      // or still be on the "Waiting for confirmation" screen.
      await expect(
        player1Page.getByRole("button", { name: /Next Board|Next Round/i }),
      ).toBeVisible({ timeout: 15000 });
      await attachScreenshot(
        player1Page,
        testInfo,
        "Player 1NS - Result state after submission",
      );
      await attachScreenshot(
        player2Page,
        testInfo,
        "Player 1EW - Result state after submission",
      );
    });

    // Step 8: Check leaderboard
    await test.step("Leaderboard displays scores", async () => {
      await player1Page.goto(`/join/${gameId}/leaderboard`);
      await player1Page.waitForLoadState("networkidle");
      await attachScreenshot(
        player1Page,
        testInfo,
        "Player - Leaderboard with scores",
      );
    });

    // Step 9: Director completes the game
    await test.step("Director marks game as complete", async () => {
      await directorPage.goto(`/manage/${gameId}/change-status`);
      await directorPage.waitForLoadState("networkidle");

      // Click the "Complete" button to change status
      const completeButton = directorPage.getByRole("button", {
        name: "Complete",
      });
      await completeButton.click();

      // Should redirect back to the director menu
      await directorPage.waitForURL(new RegExp(`/manage/${gameId}/menu`), {
        timeout: 10000,
      });
      await attachScreenshot(
        directorPage,
        testInfo,
        "Director - Game completed",
      );
    });
  } finally {
    await deleteGameStep(directorPage, gameId);
    await player2Context.close();
    await player1Context.close();
    await directorContext.close();
  }
});
