import { test, Page, TestInfo } from "@playwright/test";

/**
 * Attach a screenshot to the test report with a descriptive name.
 */
export async function attachScreenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
): Promise<void> {
  const screenshot = await page.screenshot();
  await testInfo.attach(name, {
    body: screenshot,
    contentType: "image/png",
  });
}

/**
 * Director creates a game via the /create form.
 * Returns the gameId and directorToken extracted from localStorage.
 */
export async function createGameStep(
  page: Page,
  testInfo: TestInfo,
  options: { eventName: string; directorName?: string; tables?: number },
): Promise<{ gameId: string; directorToken: string }> {
  return await test.step(
    `Director creates game "${options.eventName}" with ${options.tables ?? 2} tables`,
    async () => {
      await page.goto("/create");
      await page.getByLabel("Event Name").fill(options.eventName);
      await page
        .getByLabel("Director Name")
        .fill(options.directorName ?? "E2E Director");

      const tables = options.tables ?? 2;
      const incrementButton = page.getByRole("button", {
        name: "+",
        exact: true,
      });
      for (let i = 1; i < tables; i++) {
        await incrementButton.click();
      }

      await page
        .getByRole("button", { name: "Next", exact: true })
        .click();
      await page.waitForURL(/\/create\/.+/);

      const gameId = page.url().split("/create/")[1];
      const directorToken = await page.evaluate(
        (gid) => localStorage.getItem(`director:${gid}`),
        gameId,
      );

      await attachScreenshot(page, testInfo, "Director - Game created");
      return { gameId, directorToken: directorToken! };
    },
  );
}

/**
 * Director selects a movement on the /create/[id] page.
 */
export async function selectMovementStep(
  page: Page,
  testInfo: TestInfo,
  gameId: string,
  movementName: string = "Mitchell",
): Promise<void> {
  return await test.step(
    `Director selects ${movementName} movement`,
    async () => {
      await page
        .getByRole("button", { name: new RegExp(movementName, "i") })
        .click();
      await attachScreenshot(
        page,
        testInfo,
        `Director - ${movementName} movement selected`,
      );
    },
  );
}

/**
 * Director makes the game joinable.
 * Games created via the form already start as JOINABLE, so this navigates
 * to the change-status page and clicks "Open for Players" if needed.
 */
export async function makeGameJoinableStep(
  page: Page,
  testInfo: TestInfo,
  gameId: string,
): Promise<void> {
  return await test.step("Director makes game joinable", async () => {
    await page.goto(`/manage/${gameId}/change-status`);
    // If game is already JOINABLE this button may not appear — handle gracefully
    const openButton = page.getByRole("button", {
      name: /open for players|start|joinable/i,
    });
    if (await openButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await openButton.click();
    }
    await attachScreenshot(page, testInfo, "Director - Game made joinable");
  });
}

/**
 * Player joins a game by navigating to the select-game list, selecting
 * the game, clicking "Join As Player", choosing a seat, and entering
 * player names.
 */
export async function joinGameStep(
  page: Page,
  testInfo: TestInfo,
  gameId: string,
  options: {
    seat: string;
    players: { firstName: string; lastName: string }[];
  },
): Promise<void> {
  return await test.step(
    `Player joins game at seat ${options.seat}`,
    async () => {
      await page.goto("/join/select-game");

      // Wait for the game list to load, then click on the game
      // Games are displayed with their event name — find and click the game link
      await page.waitForLoadState("networkidle");

      // The game cards link to /join/{gameId}/menu
      const gameLink = page.locator(`a[href*="/join/${gameId}"]`).first();
      await gameLink.click();

      // Wait for the menu page
      await page.waitForURL(new RegExp(`/join/${gameId}/menu`));
      await page
        .getByRole("button", { name: "Join As Player" })
        .click();

      // Wait for the player/seat selection page
      await page.waitForURL(new RegExp(`/join/${gameId}/player`));

      // Parse the seat to get table number and direction
      // Seat format is like "1NS", "2EW", etc.
      const tableNumber = options.seat.replace(/[A-Z]+$/, "");
      const direction = options.seat.replace(/^\d+/, "");

      // Click the direction button within the correct table card
      // The table cards have a header "Table {n}" and direction buttons (NS/EW)
      const tableCard = page.locator(
        `text=Table ${tableNumber}`,
      ).locator("..");
      // The direction buttons are siblings in the grid below the table header
      await tableCard
        .locator("..")
        .getByRole("button", { name: direction, exact: true })
        .click();

      // Bottom sheet appears with player name entry fields
      // The form uses PlayerSearch components with labels like "North", "South", "East", "West"
      // For NS seat: player1 = North, player2 = South
      // For EW seat: player1 = East, player2 = West
      const playerInputs = page.locator("input[placeholder*='EBU No']");

      for (let i = 0; i < options.players.length; i++) {
        const player = options.players[i];
        const input = playerInputs.nth(i);
        // Type the player name to trigger search, then use the name directly
        await input.fill(`${player.firstName} ${player.lastName}`);
        // Wait for search results and select the first match, or if no results
        // the player will be entered as-is via the search input
        // Since E2E tests may not have players in the DB, we handle both cases
        const resultButton = page
          .locator("button")
          .filter({ hasText: player.firstName })
          .first();
        if (
          await resultButton.isVisible({ timeout: 2000 }).catch(() => false)
        ) {
          await resultButton.click();
        }
      }

      // Click "Enter Pair" to confirm the seat selection
      const enterPairButton = page.getByRole("button", {
        name: "Enter Pair",
      });
      if (await enterPairButton.isEnabled({ timeout: 5000 }).catch(() => false)) {
        await enterPairButton.click();
      }

      await attachScreenshot(
        page,
        testInfo,
        `Player - Seated at ${options.seat}`,
      );
    },
  );
}

/**
 * Player enters a result for a board on the play page.
 */
export async function enterResultStep(
  page: Page,
  testInfo: TestInfo,
  options: {
    gameId: string;
    seat: string;
    board: number;
    passOut?: boolean;
  },
): Promise<void> {
  return await test.step(
    `Player at ${options.seat} enters result for Board ${options.board}`,
    async () => {
      await page.goto(`/play/${options.gameId}/${options.seat}`);

      // Wait for the round info to load and click "Enter Round"
      await page
        .getByRole("button", { name: "Enter Round" })
        .click({ timeout: 15000 });

      // Wait for the board entry UI to appear
      await page.waitForSelector(`text=Board ${options.board}`, {
        timeout: 10000,
      });

      if (options.passOut) {
        await page.getByRole("button", { name: "Pass Out" }).click();
      }

      // Submit using the OK button (uses onSubmit event handler)
      const okButton = page.getByRole("button", { name: "OK" });
      await okButton.dispatchEvent("submit");

      await attachScreenshot(
        page,
        testInfo,
        `Player ${options.seat} - Result entered Board ${options.board}`,
      );
    },
  );
}

/**
 * Delete all games created by E2E journey tests.
 * Fetches all games from the API, filters for those with event names
 * starting with "E2E Journey", and deletes each one.
 *
 * Note: The delete endpoint requires a directorToken which is not available
 * from the games/all API response. Each deletion is wrapped in try/catch
 * and failures are logged.
 */
export async function cleanupGames(baseURL: string): Promise<void> {
  try {
    const response = await fetch(`${baseURL}/api/games/all`);
    if (!response.ok) return;

    const games: Array<{
      gameId: string;
      eventName: string;
      [key: string]: unknown;
    }> = await response.json();

    for (const game of games) {
      if (game.eventName?.startsWith("E2E Journey")) {
        try {
          await fetch(`${baseURL}/api/games/${game.gameId}/delete`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ directorToken: game.gameId }),
          });
        } catch {
          console.warn(
            `Failed to delete game ${game.gameId} during cleanup`,
          );
        }
      }
    }
  } catch {
    console.warn("Failed to fetch games during cleanup");
  }
}
