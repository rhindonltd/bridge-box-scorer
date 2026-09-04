import { Page } from "@playwright/test";

/**
 * Best-effort teardown: delete a game through the director UI so journeys
 * don't accumulate state on the shared local databases.
 *
 * Navigates straight to the delete-game confirmation page and confirms. Must
 * run in a director-authorised context (the game-creating page). Swallows
 * errors so a cleanup failure never masks the actual test result.
 */
export async function deleteGame(page: Page, gameId: string): Promise<void> {
  try {
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
