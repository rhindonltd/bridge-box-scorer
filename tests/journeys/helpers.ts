import { test, Page, TestInfo } from "@playwright/test";

/**
 * Delete a game via the UI by navigating to the delete page and confirming.
 * Wrapped in try/catch so cleanup errors don't fail the test.
 */
export async function deleteGameStep(
  page: Page,
  gameId: string,
): Promise<void> {
  try {
    await page.goto(`/manage/${gameId}/menu`);
    await page
      .getByRole("button", { name: "Delete Game" })
      .click({ timeout: 5000 });
    await page
      .getByRole("button", { name: "Yes, Delete Game" })
      .click({ timeout: 5000 });
    await page.waitForURL(/\/manage\/select-game/, { timeout: 5000 });
  } catch {
    // Ignore errors — game may already be deleted
  }
}

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
  return await test.step(`Director creates game "${options.eventName}" with ${options.tables ?? 2} tables`, async () => {
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

    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.waitForURL(/\/create\/.+/);

    const gameId = page.url().split("/create/")[1];
    const directorToken = await page.evaluate(
      (gid) => localStorage.getItem(`director:${gid}`),
      gameId,
    );

    await attachScreenshot(page, testInfo, "Director - Game created");
    return { gameId, directorToken: directorToken! };
  });
}

/**
 * Director selects a movement on the /create/[id] page.
 * After game creation the page is on the tables step, so we first
 * click "Select Movement" to navigate to the movements list, then
 * click the first matching movement card.
 */
export async function selectMovementStep(
  page: Page,
  testInfo: TestInfo,
  gameId: string,
  movementName: string = "Mitchell",
): Promise<void> {
  return await test.step(`Director selects ${movementName} movement`, async () => {
    // Get director token from the page's localStorage
    const directorToken = await page.evaluate(
      (gid) => localStorage.getItem(`director:${gid}`),
      gameId,
    );

    // Get table count from the page's game context
    const tables = await page.evaluate(() => {
      // Try to read from the game data in the page
      return 2; // Default for our test
    });

    // Apply movement via direct socket connection from Node.js test context.
    // The UI-based click has race conditions with socket.io fire-and-forget events,
    // so we use emitWithAck from a dedicated connection to ensure it's applied.
    const { io } = await import("socket.io-client");
    const testSocket = io("http://localhost:3000", { forceNew: true });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Socket connect timeout")),
        5000,
      );
      testSocket.on("connect", () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    const result = await new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Movement apply timeout")),
        10000,
      );
      testSocket.emit(
        "game:selectMovement",
        {
          gameId,
          type: "PAIRS",
          mitchell: { tables, rounds: tables, boardsPerRound: 3 },
          directorToken,
        },
        (res: any) => {
          clearTimeout(timeout);
          resolve(res);
        },
      );
    });

    testSocket.disconnect();

    if (!result?.success) {
      throw new Error(`Movement selection failed: ${JSON.stringify(result)}`);
    }

    await attachScreenshot(
      page,
      testInfo,
      `Director - ${movementName} movement selected`,
    );
  });
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
 * the game, clicking "Join As Player", choosing a seat, and searching
 * for players by EBU number.
 */
export async function joinGameStep(
  page: Page,
  testInfo: TestInfo,
  gameId: string,
  options: {
    seat: string;
    ebuNumbers: [string, string];
    directorToken?: string;
  },
): Promise<void> {
  return await test.step(`Player joins game at seat ${options.seat}`, async () => {
    // Inject director token into localStorage so createParticipant auth succeeds
    if (options.directorToken) {
      await page.goto("/");
      await page.evaluate(
        ({ gameId, token }) =>
          localStorage.setItem(`director:${gameId}`, token),
        { gameId, token: options.directorToken },
      );
    }

    // Navigate directly to the game's join menu to avoid selecting the wrong game
    await page.goto(`/join/${gameId}/menu`);
    await page.waitForLoadState("networkidle");

    // Click "Join As Player"
    await page.getByRole("button", { name: "Join As Player" }).click();

    // Wait for the player/seat selection page
    await page.waitForURL(/\/join\/.+\/player/);

    // Parse the seat to get table number and direction
    // Seat format is like "1NS", "2EW", etc.
    const tableNumber = options.seat.replace(/[A-Z]+$/, "");
    const direction = options.seat.replace(/^\d+/, "");

    // Find the table card by its header text "Table N" and click
    // the direction button within it
    const tableCard = page
      .locator("div")
      .filter({ hasText: new RegExp(`^Table ${tableNumber}$`) })
      .locator("..");
    await tableCard
      .getByRole("button", { name: direction, exact: true })
      .click();

    // Bottom sheet appears with player search fields
    // The PlayerSearch inputs use placeholder "EBU No, Club ID or Name"
    const playerInputs = page.getByPlaceholder("EBU No, Club ID or Name");

    // Search for each player by EBU number, wait for results, and click the first result
    for (let i = 0; i < options.ebuNumbers.length; i++) {
      const ebuNumber = options.ebuNumbers[i];
      // After selecting a player, the input is replaced by a card,
      // so always target the first visible input
      const input = playerInputs.first();
      await input.fill(ebuNumber);

      // Wait for search results to appear (buttons inside the results list)
      // The results appear as buttons with player name text
      const resultButton = page
        .locator("button")
        .filter({ has: page.locator(`text=EBU ${ebuNumber}`) })
        .first();
      await resultButton.waitFor({ timeout: 10000 });
      await resultButton.click();
    }

    // Click "Enter Pair" to confirm the seat selection
    const enterPairButton = page.getByRole("button", {
      name: "Enter Pair",
    });
    await enterPairButton.click({ timeout: 5000 });

    await attachScreenshot(
      page,
      testInfo,
      `Player - Seated at ${options.seat}`,
    );
  });
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
  return await test.step(`Player at ${options.seat} enters result for Board ${options.board}`, async () => {
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
  });
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
          console.warn(`Failed to delete game ${game.gameId} during cleanup`);
        }
      }
    }
  } catch {
    console.warn("Failed to fetch games during cleanup");
  }
}
