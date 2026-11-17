import { Page } from "@playwright/test";

/**
 * Reopen a game if it is finalised, so it can be deleted. A finalised game is
 * read-only (the delete route refuses it) and its manage pages redirect away.
 * Uses the director token the app stored on this device. A no-op for an open
 * game; failures are ignored.
 */
async function reopenIfFinalised(page: Page, gameId: string): Promise<void> {
  try {
    // localStorage needs an app page; the main menu is always available.
    await page.goto("/");
    const token = await page.evaluate(
      (id) => window.localStorage.getItem(`director:${id}`),
      gameId,
    );
    if (token) {
      await page.request.delete(`/api/games/${gameId}/finalise`, {
        headers: { "x-director-token": token },
      });
    }
  } catch {
    // Best-effort only.
  }
}

/**
 * Best-effort teardown: delete a game through the director UI so journeys
 * don't accumulate state on the shared local databases.
 *
 * Reopens the game first if it was finalised, then navigates to the delete-game
 * confirmation page and confirms. Must run in a director-authorised context
 * (the game-creating page). Swallows errors so a cleanup failure never masks
 * the actual test result.
 */
export async function deleteGame(page: Page, gameId: string): Promise<void> {
  try {
    await reopenIfFinalised(page, gameId);
    await page.goto(`/game/${gameId}/manage/delete-game`);
    await page
      .getByRole("button", { name: "Yes, Delete Game" })
      .click({ timeout: 10000 });
    // The app redirects away from the game once deletion completes.
    await page.waitForURL((url) => !url.pathname.includes(gameId), {
      timeout: 10000,
    });
  } catch {
    // Best-effort cleanup only.
  }
}
