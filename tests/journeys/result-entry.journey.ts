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

test.beforeAll(async () => {
  await cleanupGames("http://localhost:3000");
});

test.afterAll(async () => {
  await cleanupGames("http://localhost:3000");
});

test("NS and EW enter matching results and see confirmation", async ({
  browser,
}, testInfo) => {
  const deviceConfig = test.info().project.use;

  // Director creates the game
  const directorContext = await browser.newContext(deviceConfig);
  const directorPage = await directorContext.newPage();

  // Two player contexts for NS and EW at the same table
  const nsContext = await browser.newContext(deviceConfig);
  const nsPage = await nsContext.newPage();

  const ewContext = await browser.newContext(deviceConfig);
  const ewPage = await ewContext.newPage();

  let gameId = "";

  try {
    // Step 1: Director creates game
    ({ gameId } = await createGameStep(directorPage, testInfo, {
      eventName: `E2E Journey - Result Entry - ${Date.now()}`,
      tables: 2,
    }));

    // Step 2: Director selects Mitchell movement
    await selectMovementStep(directorPage, testInfo, gameId, "Mitchell");

    // Step 3: Director makes game joinable
    await makeGameJoinableStep(directorPage, testInfo, gameId);

    // Step 4: NS player joins at Table 1 NS
    await joinGameStep(nsPage, testInfo, gameId, {
      seat: "A1NS",
      ebuNumbers: ["477484", "404476"],
    });

    // Step 5: EW player joins at Table 1 EW
    await joinGameStep(ewPage, testInfo, gameId, {
      seat: "A1EW",
      ebuNumbers: ["12269", "16671"],
    });

    // Step 6: NS enters result — Pass Out for Board 1
    await enterResultStep(nsPage, testInfo, {
      gameId,
      seat: "A1NS",
      board: 1,
      passOut: true,
    });

    // Step 7: NS should be waiting for EW confirmation
    await test.step("NS sees waiting state", async () => {
      await expect(nsPage.getByText("Waiting for confirmation")).toBeVisible({
        timeout: 15000,
      });
      await attachScreenshot(
        nsPage,
        testInfo,
        "NS - Waiting for EW confirmation",
      );
    });

    // Step 8: EW enters same result — Pass Out for Board 1
    await enterResultStep(ewPage, testInfo, {
      gameId,
      seat: "A1EW",
      board: 1,
      passOut: true,
    });

    // Step 9: Both players see confirmation (board results page)
    await test.step("Both players see confirmation after matching results", async () => {
      // After both submit matching results, the board is confirmed via Socket.IO
      // NS transitions from waiting to boardResults state
      await expect(nsPage.getByText(/Board 1/i)).toBeVisible({
        timeout: 15000,
      });
      await attachScreenshot(nsPage, testInfo, "NS - Result confirmed Board 1");

      // EW also transitions from waiting to boardResults state
      await expect(ewPage.getByText(/Board 1/i)).toBeVisible({
        timeout: 15000,
      });
      await attachScreenshot(ewPage, testInfo, "EW - Result confirmed Board 1");
    });
  } finally {
    await deleteGameStep(directorPage, gameId);
    await ewContext.close();
    await nsContext.close();
    await directorContext.close();
  }
});
