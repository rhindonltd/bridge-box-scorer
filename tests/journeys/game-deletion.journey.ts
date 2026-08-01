import { test, expect } from "@playwright/test";
import {
  createGameStep,
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

test("Game deletion with confirmation and verification", async ({
  browser,
}, testInfo) => {
  const deviceConfig = test.info().project.use;

  const directorContext = await browser.newContext(deviceConfig);
  const directorPage = await directorContext.newPage();

  const playerContext = await browser.newContext(deviceConfig);
  const playerPage = await playerContext.newPage();

  try {
    // Step 1: Director creates a game
    const { gameId } = await createGameStep(directorPage, testInfo, {
      eventName: `E2E Journey - Game Deletion - ${Date.now()}`,
      directorName: "E2E Director",
      tables: 2,
    });

    // Step 2: Make game joinable so it appears in the joinable list
    await makeGameJoinableStep(directorPage, testInfo, gameId);

    // Step 3: Verify game appears in the joinable list from player perspective
    await test.step(
      "Player verifies game appears in joinable list",
      async () => {
        await playerPage.goto("/join/select-game");
        await playerPage.waitForLoadState("networkidle");

        const gameLink = playerPage
          .locator(`a[href*="/join/${gameId}"]`)
          .first();
        await expect(gameLink).toBeVisible({ timeout: 10000 });
        await attachScreenshot(
          playerPage,
          testInfo,
          "Player - Game visible in joinable list before deletion",
        );
      },
    );

    // Step 4: Director navigates to delete-game page
    await test.step(
      "Director navigates to delete-game page",
      async () => {
        await directorPage.goto(`/manage/${gameId}/delete-game`);
        await directorPage.waitForLoadState("networkidle");
        await attachScreenshot(
          directorPage,
          testInfo,
          "Director - Delete game confirmation page",
        );
      },
    );

    // Step 5: Verify confirmation message shows the event name
    await test.step(
      "Confirmation message displays game event name",
      async () => {
        await expect(
          directorPage.getByText("Are you sure you want to delete"),
        ).toBeVisible();

        // The event name is wrapped in a <strong> tag
        const eventNameElement = directorPage.locator("strong").filter({
          hasText: "E2E Journey - Game Deletion",
        });
        await expect(eventNameElement).toBeVisible();

        await attachScreenshot(
          directorPage,
          testInfo,
          "Director - Confirmation message with event name",
        );
      },
    );

    // Step 6: Director clicks "Yes, Delete Game"
    await test.step("Director confirms deletion", async () => {
      await directorPage
        .getByRole("button", { name: "Yes, Delete Game" })
        .click();

      // Verify redirect to /manage/select-game
      await directorPage.waitForURL(/\/manage\/select-game/, {
        timeout: 15000,
      });
      await attachScreenshot(
        directorPage,
        testInfo,
        "Director - Redirected to select-game after deletion",
      );
    });

    // Step 7: Player navigates to /join/select-game and verifies game is gone
    await test.step(
      "Player verifies deleted game no longer appears in joinable list",
      async () => {
        await playerPage.goto("/join/select-game");
        await playerPage.waitForLoadState("networkidle");

        const gameLink = playerPage
          .locator(`a[href*="/join/${gameId}"]`)
          .first();
        await expect(gameLink).not.toBeVisible({ timeout: 10000 });
        await attachScreenshot(
          playerPage,
          testInfo,
          "Player - Game no longer in joinable list after deletion",
        );
      },
    );

    // Step 8: Verify game no longer appears in /api/games/all API response
    await test.step(
      "API confirms game no longer exists in /api/games/all",
      async () => {
        const response = await fetch(`${BASE_URL}/api/games/all`);
        expect(response.ok).toBe(true);

        const games: Array<{ gameId: string; [key: string]: unknown }> =
          await response.json();
        const deletedGame = games.find((g) => g.gameId === gameId);
        expect(deletedGame).toBeUndefined();

        await attachScreenshot(
          directorPage,
          testInfo,
          "Director - Final state after deletion verified",
        );
      },
    );
  } finally {
    await playerContext.close();
    await directorContext.close();
  }
});
