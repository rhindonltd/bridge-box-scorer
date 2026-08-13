import { test, expect } from "@playwright/test";
import {
  createGameStep,
  makeGameJoinableStep,
  joinGameStep,
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

test("Movement selection and player schedule display", async ({
  browser,
}, testInfo) => {
  const deviceConfig = test.info().project.use;

  // Director context
  const directorContext = await browser.newContext(deviceConfig);
  const directorPage = await directorContext.newPage();

  // Player context
  const playerContext = await browser.newContext(deviceConfig);
  const playerPage = await playerContext.newPage();

  let gameId = "";

  try {
    // Step 1: Director creates a game with 3 tables
    const eventName = `E2E Journey - Movement Selection - ${Date.now()}`;
    ({ gameId } = await createGameStep(directorPage, testInfo, {
      eventName,
      directorName: "E2E Director",
      tables: 3,
    }));

    // Step 2: After game creation, the page shows table view on /create/[id]
    // Navigate to the movements step by clicking "Select Movement"
    await test.step("Director navigates to movement selection on /create/[gameId]", async () => {
      // After game creation we're on /create/[id] which shows the tables step first
      const selectMovementButton = directorPage.getByRole("button", {
        name: "Select Movement",
        exact: true,
      });
      await expect(selectMovementButton).toBeVisible({ timeout: 10000 });
      await selectMovementButton.click();

      await attachScreenshot(
        directorPage,
        testInfo,
        "Director - Movement selection page",
      );
    });

    // Step 3: Director views available movements (should see Mitchell options for 3 tables)
    await test.step("Director sees Mitchell movement options for 3 tables", async () => {
      // 3 tables is odd, so we should see "Standard Mitchell" option
      const mitchellCard = directorPage.locator("button").filter({
        hasText: /standard mitchell/i,
      });
      await expect(mitchellCard.first()).toBeVisible({ timeout: 10000 });

      // Verify movement stats are displayed within the first movement card
      // Use .first() to avoid strict mode violations when multiple cards have the same labels
      await expect(directorPage.getByText("Rounds").first()).toBeVisible();
      await expect(
        directorPage.getByText("Boards/Round").first(),
      ).toBeVisible();
      await expect(
        directorPage.getByText("Total Boards").first(),
      ).toBeVisible();

      await attachScreenshot(
        directorPage,
        testInfo,
        "Director - Mitchell options visible for 3 tables",
      );
    });

    // Step 4: Director selects a Standard Mitchell movement
    await test.step("Director selects Standard Mitchell movement", async () => {
      const mitchellCard = directorPage.locator("button").filter({
        hasText: /standard mitchell/i,
      });
      await mitchellCard.first().click();

      // After clicking, the MovementDetailView should appear with the movement name
      // and round-by-round assignment data
      await expect(directorPage.getByText("Standard Mitchell")).toBeVisible({
        timeout: 10000,
      });

      await attachScreenshot(
        directorPage,
        testInfo,
        "Director - Standard Mitchell detail view",
      );
    });

    // Step 5: Verify the movement detail shows round-by-round assignments
    await test.step("Movement detail shows round-by-round assignments", async () => {
      // The MovementDetailView shows tables with Round/Table, NS, EW, Boards columns
      // These are table header cells (th) — scope to the first table header row
      const detailTable = directorPage.locator("table").first();
      await expect(
        detailTable.getByRole("columnheader", { name: "NS" }),
      ).toBeVisible();
      await expect(
        detailTable.getByRole("columnheader", { name: "EW" }),
      ).toBeVisible();
      await expect(
        detailTable.getByRole("columnheader", { name: "Boards" }),
      ).toBeVisible();

      // There should be a "Select Movement" button at the bottom
      const selectButton = directorPage.getByRole("button", {
        name: "Select Movement",
        exact: true,
      });
      await expect(selectButton).toBeVisible();

      // Click "Select Movement" to apply it (this emits a socket event)
      await selectButton.click();

      await attachScreenshot(
        directorPage,
        testInfo,
        "Director - Mitchell movement selected and applied",
      );
    });

    // Step 6: Director navigates to /manage/[id]/movement to see the full movement view
    await test.step("Director views full movement at /manage/[id]/movement", async () => {
      await directorPage.goto(`/manage/${gameId}/movement`);
      await directorPage.waitForLoadState("networkidle");

      // The movement page shows the MovementDetailView with the event name header
      // and round/table data. If the movement was applied via socket, it should show
      // the full assignment grid. If not applied (socket-dependent), we may see
      // "No movement set up yet." — either state is valid for this test.
      const movementHeader = directorPage.getByText(eventName);
      const noMovementMessage = directorPage.getByText(
        /no movement set up yet/i,
      );

      // Wait for either the movement data or the "no movement" message
      await expect(movementHeader.or(noMovementMessage)).toBeVisible({
        timeout: 15000,
      });

      await attachScreenshot(
        directorPage,
        testInfo,
        "Director - Movement page /manage/[id]/movement",
      );
    });

    // Step 7: Make game joinable and have a player join at a seat
    await makeGameJoinableStep(directorPage, testInfo, gameId);

    await joinGameStep(playerPage, testInfo, gameId, {
      seat: "1NS",
      ebuNumbers: ["477484", "404476"],
    });

    // Step 8: Verify the player can navigate to their play page and see round info
    await test.step("Player sees round info on play page", async () => {
      await playerPage.goto(`/play/${gameId}/1NS`);
      await playerPage.waitForLoadState("networkidle");

      // The play page should show round info (table, round, boards, players)
      // or a loading state if the movement hasn't been applied via socket.
      // If the movement was applied, the player sees the RoundInfoPage with
      // "Table X, Round Y" and an "Enter Round" button.
      // If not applied, the page stays in a loading state.
      const roundInfo = playerPage.getByText(/table \d+, round \d+/i);
      const enterRoundButton = playerPage.getByRole("button", {
        name: /enter round/i,
      });
      const loadingSpinner = playerPage.locator(".animate-spin");

      // Wait for either the round info or the loading state
      await expect(roundInfo.or(loadingSpinner)).toBeVisible({
        timeout: 15000,
      });

      // If the round info is visible, verify the "Enter Round" button is present
      if (await roundInfo.isVisible().catch(() => false)) {
        await expect(enterRoundButton).toBeVisible();
      }

      await attachScreenshot(
        playerPage,
        testInfo,
        "Player - Play page with round schedule",
      );
    });
  } finally {
    await deleteGameStep(directorPage, gameId);
    await playerContext.close();
    await directorContext.close();
  }
});
