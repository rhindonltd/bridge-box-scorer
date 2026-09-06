import { test, expect } from "@playwright/test";

import { createGame } from "../fixtures/game-create";
import { deleteGame } from "../fixtures/delete-game";
import { newParticipant } from "./support";

/**
 * Delete-game journey.
 *
 * The director confirmation screen names the event, deletes on confirm
 * (clearing the local director token and navigating away), shows a "Deleting…"
 * in-flight state, and surfaces an inline error when the DELETE fails.
 */

test.describe("Delete game", () => {
  test("confirming deletion clears the token and navigates away", async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const page = await newParticipant(browser);
    const eventName = `Delete Me ${Date.now()}`;

    const { gameId } = await createGame(page, {
      eventName,
      recordOpeningLead: false,
    });

    await page.goto(`/game/${gameId}/manage/delete-game`);

    // The confirmation names the event.
    await expect(
      page.getByText(`Are you sure you want to delete ${eventName}?`),
    ).toBeVisible({ timeout: 15000 });

    // Precondition: the director token is held for this game.
    const before = await page.evaluate(
      (id) => localStorage.getItem(`director:${id}`),
      gameId,
    );
    expect(before).toBeTruthy();

    // Confirm deletion.
    await page.getByRole("button", { name: "Yes, Delete Game" }).click();

    // On success the app leaves the delete screen and the director token for
    // this game is cleared.
    await expect(page).not.toHaveURL(new RegExp(`/game/${gameId}/manage/delete-game`), {
      timeout: 15000,
    });
    await expect
      .poll(
        () =>
          page.evaluate((id) => localStorage.getItem(`director:${id}`), gameId),
        { timeout: 15000 },
      )
      .toBeNull();

    await page.context().close();
  });

  test("a failed delete shows the inline error and keeps the game", async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const page = await newParticipant(browser);
    const eventName = `Delete Fail ${Date.now()}`;

    const { gameId } = await createGame(page, {
      eventName,
      recordOpeningLead: false,
    });

    try {
      await page.goto(`/game/${gameId}/manage/delete-game`);
      await expect(
        page.getByText(`Are you sure you want to delete ${eventName}?`),
      ).toBeVisible({ timeout: 15000 });

      // Make the DELETE fail so the error path is exercised.
      await page.route(`**/api/games/${gameId}/delete`, (route) =>
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ success: false, error: "Failed to delete game" }),
        }),
      );

      await page.getByRole("button", { name: "Yes, Delete Game" }).click();

      // The "Deleting…" state shows briefly, then the inline error appears and
      // the game is NOT deleted (still on the delete screen).
      await expect(page.getByText("Failed to delete game")).toBeVisible({
        timeout: 15000,
      });
      await expect(page).toHaveURL(
        new RegExp(`/game/${gameId}/manage/delete-game`),
      );
    } finally {
      await page.unroute(`**/api/games/${gameId}/delete`).catch(() => {});
      // Real cleanup (route is now removed so the DELETE succeeds).
      await deleteGame(page, gameId);
      await page.context().close();
    }
  });
});
