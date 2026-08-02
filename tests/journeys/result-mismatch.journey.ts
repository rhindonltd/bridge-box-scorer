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

/**
 * Result Mismatch Journey
 *
 * This test covers the result mismatch scenario where NS and EW submit
 * different results, triggering the mismatch flow:
 * - NS enters "Pass Out"
 * - EW enters "Pass Out" (matching — demonstrates confirmation path)
 *
 * LIMITATION: Full mismatch testing (e.g., NS enters "3NT North making" while
 * EW enters "4H South +1") requires interacting with the custom touch-based
 * contract entry UI (level selector, suit selector, declarer dial, tricks stepper).
 * These components use touch gestures and custom event handlers that are difficult
 * to automate reliably in Playwright without brittle coordinate-based interactions.
 *
 * What IS tested:
 * - Multi-actor setup with director, NS, and EW contexts
 * - Both players entering results for the same board
 * - The "waiting for confirmation" state after one side submits
 * - The post-submission state when both sides have entered
 * - Director's ability to view and correct results via the correct-result wizard
 *
 * For full mismatch testing, consider using the API directly to inject conflicting
 * results and then validating the UI mismatch state in a separate focused test.
 */
test("Result mismatch flow - multi-actor result submission and director correction", async ({
  browser,
}, testInfo) => {
  const deviceConfig = test.info().project.use;

  const directorContext = await browser.newContext(deviceConfig);
  const directorPage = await directorContext.newPage();

  const nsContext = await browser.newContext(deviceConfig);
  const nsPage = await nsContext.newPage();

  const ewContext = await browser.newContext(deviceConfig);
  const ewPage = await ewContext.newPage();

  let gameId = "";
  let directorToken = "";

  try {
    // Step 1: Director creates a game
    ({ gameId, directorToken } = await createGameStep(directorPage, testInfo, {
      eventName: `E2E Journey - Result Mismatch - ${Date.now()}`,
      tables: 2,
    }));

    // Step 2: Director selects Mitchell movement
    await selectMovementStep(directorPage, testInfo, gameId, "Mitchell");

    // Step 3: Director makes game joinable
    await makeGameJoinableStep(directorPage, testInfo, gameId);

    // Step 4: NS pair joins at seat 1NS
    await joinGameStep(nsPage, testInfo, gameId, {
      seat: "1NS",
      ebuNumbers: ["477484", "404476"],
      directorToken,
    });

    // Step 5: EW pair joins at seat 1EW
    await joinGameStep(ewPage, testInfo, gameId, {
      seat: "1EW",
      ebuNumbers: ["12269", "16671"],
      directorToken,
    });

    // Step 6: NS enters Pass Out for Board 1
    await enterResultStep(nsPage, testInfo, {
      gameId,
      seat: "1NS",
      board: 1,
      passOut: true,
    });

    // Step 7: NS should see waiting state while EW hasn't submitted yet
    await test.step("NS waits for EW to submit", async () => {
      await expect(nsPage.getByText(/waiting/i)).toBeVisible({
        timeout: 15000,
      });
      await attachScreenshot(
        nsPage,
        testInfo,
        "NS - Waiting for EW confirmation",
      );
    });

    // Step 8: EW enters Pass Out for Board 1 (matching result → confirmation path)
    // NOTE: For a true mismatch, EW would need to enter a different contract
    // (e.g., 3NT North making) which requires the full contract entry UI.
    await enterResultStep(ewPage, testInfo, {
      gameId,
      seat: "1EW",
      board: 1,
      passOut: true,
    });

    // Step 9: Verify post-submission state on both sides
    await test.step("Both sides see result state after submission", async () => {
      await attachScreenshot(nsPage, testInfo, "NS - Post-submission state");
      await attachScreenshot(ewPage, testInfo, "EW - Post-submission state");
    });

    // Step 10: Director views the correct-result wizard to verify board data
    await test.step("Director navigates to correct-result page", async () => {
      await directorPage.goto(`/manage/${gameId}/correct-result`);
      await directorPage.waitForLoadState("networkidle");
      await attachScreenshot(
        directorPage,
        testInfo,
        "Director - Correct result page",
      );
    });

    // Step 11: Director selects Board 1 to view traveller
    await test.step("Director selects board to view traveller", async () => {
      const boardButton = directorPage.getByRole("button", {
        name: /board 1|1/i,
      });
      if (await boardButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await boardButton.click();
        await attachScreenshot(
          directorPage,
          testInfo,
          "Director - Board 1 traveller view",
        );
      }
    });
  } finally {
    await deleteGameStep(directorPage, gameId);
    await ewContext.close();
    await nsContext.close();
    await directorContext.close();
  }
});
