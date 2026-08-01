import { test, expect } from "@playwright/test";
import { createGameStep, attachScreenshot, cleanupGames, deleteGameStep } from "./helpers";

const BASE_URL = "http://localhost:3000";

test.beforeAll(async () => {
  await cleanupGames(BASE_URL);
});

test.afterAll(async () => {
  await cleanupGames(BASE_URL);
});

test("Director corrects a result via traveller view", async ({ browser }, testInfo) => {
  const deviceConfig = test.info().project.use;

  const directorContext = await browser.newContext(deviceConfig);
  const directorPage = await directorContext.newPage();

  let gameId = "";

  try {
    // Step 1: Director creates a game
    ({ gameId } = await createGameStep(directorPage, testInfo, {
      eventName: `E2E Journey - Director Correction - ${Date.now()}`,
      directorName: "E2E Director",
      tables: 2,
    }));

    // Step 2: Navigate to the correct-result page
    await test.step("Director navigates to correct-result page", async () => {
      // Intercept the boards API to provide mock board data (since no real results exist)
      await directorPage.route(`**/api/games/${gameId}/boards`, (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ boards: [1, 2, 3, 4, 5, 6] }),
        });
      });

      await directorPage.goto(`/manage/${gameId}/correct-result`);
      await directorPage.waitForLoadState("networkidle");

      await expect(directorPage.getByText("Select Board")).toBeVisible();
      await attachScreenshot(directorPage, testInfo, "Director - Correct result page loaded");
    });

    // Step 3: Select a board number
    await test.step("Director selects board number 1", async () => {
      // Intercept the board instances API to provide mock traveller data
      await directorPage.route(`**/api/games/${gameId}/boards/1`, (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            instances: [
              {
                roundNumber: 1,
                tableNumber: 1,
                boardNumber: 1,
                participants: {
                  type: "PAIRS",
                  ns: "1",
                  ew: "2",
                  nsNames: "Alice & Bob",
                  ewNames: "Carol & Dave",
                },
                currentResult: "3NTN=",
                status: "CONFIRMED",
              },
              {
                roundNumber: 1,
                tableNumber: 2,
                boardNumber: 1,
                participants: {
                  type: "PAIRS",
                  ns: "3",
                  ew: "4",
                  nsNames: "Eve & Frank",
                  ewNames: "Grace & Henry",
                },
                currentResult: null,
                status: null,
              },
            ],
          }),
        });
      });

      // Click board number 1
      await directorPage.getByRole("button", { name: "1", exact: true }).click();
      await attachScreenshot(directorPage, testInfo, "Director - Board 1 selected");
    });

    // Step 4: View the traveller with instances
    await test.step("Director views traveller with board instances", async () => {
      // Verify the traveller view heading
      await expect(directorPage.getByText("Board 1")).toBeVisible();
      await expect(directorPage.getByText("Tap a row to adjust the result")).toBeVisible();

      // Verify participant data is displayed
      await expect(directorPage.getByText("Alice & Bob")).toBeVisible();
      await expect(directorPage.getByText("Carol & Dave")).toBeVisible();

      await attachScreenshot(directorPage, testInfo, "Director - Traveller view for Board 1");
    });

    // Step 5: Select an instance to open the contract entry panel
    await test.step("Director selects instance to correct", async () => {
      // Click the first row (Table 1, Round 1) in the traveller table
      const firstRow = directorPage.locator("tr").filter({ hasText: "Alice & Bob" });
      await firstRow.click();

      await attachScreenshot(directorPage, testInfo, "Director - Instance selected");
    });

    // Step 6: Verify the contract entry panel shows with correct info
    await test.step("Contract entry panel displays with correct board/table/round info", async () => {
      // The ContractEntryPanel renders headerText="Correcting Board 1" and
      // subHeaderText="Table 1, Round 1"
      await expect(directorPage.getByText("Correcting Board 1")).toBeVisible();
      await expect(directorPage.getByText("Table 1, Round 1")).toBeVisible();

      // Verify the contract entry UI elements are present
      await expect(directorPage.getByText("Pass Out")).toBeVisible();

      await attachScreenshot(directorPage, testInfo, "Director - Contract entry panel shown");
    });
  } finally {
    await deleteGameStep(directorPage, gameId);
    await directorContext.close();
  }
});
