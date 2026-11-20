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
  test("an out-of-date director token on a game being set up goes back to Create Game, not Manage Game", async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const page = await newParticipant(browser);
    const eventName = `Stale Token ${Date.now()}`;
    const { gameId, directorToken } = await createGame(page, {
      eventName,
      recordOpeningLead: false,
    });
    try {
      // The device still holds a token, but the server no longer accepts it.
      await page.evaluate(
        (id) => localStorage.setItem(`director:${id}`, "out-of-date"),
        gameId,
      );
      await page.goto(`/create`);
      await page.getByRole("button", { name: new RegExp(eventName) }).click();

      // The setup screens check the token with the server and send the device
      // back to the list it came from, with the bad token cleared.
      await expect(page).toHaveURL(/\/create$/, { timeout: 15000 });
      await expect(
        page.getByRole("button", { name: new RegExp(eventName) }),
      ).toBeVisible({ timeout: 15000 });

      // Picking the game again now asks the device to become a director.
      await page.getByRole("button", { name: new RegExp(eventName) }).click();
      await expect(page.locator("#share-code")).toBeVisible({ timeout: 15000 });

      // The Delete Game screen does the same if opened directly.
      await page.goto(`/game/${gameId}/manage/delete-game`);
      await expect(page).toHaveURL(/\/create$/, { timeout: 15000 });
    } finally {
      await page.evaluate(
        ({ id, token }) => localStorage.setItem(`director:${id}`, token),
        { id: gameId, token: directorToken },
      );
      await deleteGame(page, gameId);
      await page.context().close();
    }
  });

  test("cancelling on a game still being set up returns to its setup menu, even after a reload", async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const page = await newParticipant(browser);
    const { gameId } = await createGame(page, {
      eventName: `Cancel Delete ${Date.now()}`,
      recordOpeningLead: false,
    });
    try {
      // A fresh load leaves no in-app history to go back to.
      await page.goto(`/game/${gameId}/manage/delete-game`);
      await page
        .getByRole("button", { name: "Cancel" })
        .click({ timeout: 15000 });
      await expect(page).toHaveURL(new RegExp(`/game/${gameId}/create`), {
        timeout: 15000,
      });
      await expect(
        page.getByRole("button", { name: "Start Game", exact: true }),
      ).toBeVisible({ timeout: 15000 });
    } finally {
      await deleteGame(page, gameId);
      await page.context().close();
    }
  });

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
    await expect(page).not.toHaveURL(
      new RegExp(`/game/${gameId}/manage/delete-game`),
      {
        timeout: 15000,
      },
    );
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
          body: JSON.stringify({
            success: false,
            error: "Failed to delete game",
          }),
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
