import { Page, expect } from "@playwright/test";

/**
 * Pure-UI game creation helper.
 *
 * Drives the `/create` form exactly as a director would: fills the event and
 * director name, submits, and waits for the redirect to the per-game setup
 * route (`/game/{id}/create`). The director token is written to localStorage
 * by the app during creation, so the returned {@link CreatedGame.page} context
 * is authorised to manage the game (start it, override travellers, delete it).
 */

export interface CreatedGame {
  gameId: string;
  /** The director token the app stored in localStorage for this game. */
  directorToken: string;
}

export async function createGame(
  page: Page,
  opts: { eventName: string; directorName?: string },
): Promise<CreatedGame> {
  await page.goto("/create");

  await page.getByLabel("Event Name").fill(opts.eventName);
  await page.getByLabel("Director Name").fill(opts.directorName ?? "E2E Director");
  await page.getByRole("button", { name: "Create Game", exact: true }).click();

  await page.waitForURL(/\/game\/.+\/create/, { timeout: 15000 });

  const match = /\/game\/([^/]+)\/create/.exec(page.url());
  if (!match) {
    throw new Error(`Unexpected create URL: ${page.url()}`);
  }
  const gameId = match[1];

  // The setup page hydrates asynchronously; wait for it to leave the
  // "Loading game..." state before returning so callers can act immediately.
  await expect(page.getByRole("tab", { name: "Tables" })).toBeVisible({
    timeout: 15000,
  });

  const directorToken = await page.evaluate(
    (id) => localStorage.getItem(`director:${id}`),
    gameId,
  );
  if (!directorToken) {
    throw new Error(`Director token was not stored for game ${gameId}`);
  }

  return { gameId, directorToken };
}
