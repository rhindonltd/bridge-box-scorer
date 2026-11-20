import { test, expect } from "@playwright/test";
import {
  closeDevices,
  directorStorage,
  newDevice,
  seatStorage,
  seedGame,
} from "../fixtures/seeded-game";

/**
 * Call Director.
 *
 * A seated player taps Call Director in the play menu and confirms. Every
 * director device gets a popup saying which table to go to. Calling again
 * before anyone answers updates the same popup. When a director dismisses it,
 * the player is told the director is on the way. Each director dismisses
 * their own copy.
 */

const KEEP = { keepDirectorAlerts: true };

test.describe("Call Director", () => {
  test("a player calls the director, who is sent to the table and answers", async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    const eventName = `Call Director ${Date.now()}`;
    const game = await seedGame({ scoring: "MP", tables: 3, eventName });

    const directorA = await (
      await newDevice(browser, directorStorage(game), KEEP)
    ).newPage();
    const directorB = await (
      await newDevice(browser, directorStorage(game), KEEP)
    ).newPage();
    const player = await (
      await newDevice(browser, seatStorage(game, "A1NS"), KEEP)
    ).newPage();

    try {
      for (const d of [directorA, directorB]) {
        await d.goto(`/game/${game.gameId}/manage`);
        await expect(
          d.getByRole("button", { name: "Delete Game" }),
        ).toBeVisible({ timeout: 15000 });
      }
      await player.goto(`/game/${game.gameId}/play/A1NS`);

      // Ask, and confirm.
      await player.getByRole("button", { name: "Menu" }).click();
      await player.getByRole("menuitem", { name: "Call Director" }).click();
      await expect(player.getByText("Call the director?")).toBeVisible();
      await player.getByRole("button", { name: "Call Director" }).click();
      await expect(player.getByText("Director called")).toBeVisible({
        timeout: 15000,
      });
      await expect(player.getByRole("dialog")).toContainText(
        "come to Table 1, Round 1",
      );
      await player.getByRole("button", { name: "OK" }).click();

      // Both directors are told where to go.
      for (const d of [directorA, directorB]) {
        const alert = d.getByRole("alertdialog");
        await expect(alert).toContainText("Go to Table 1", { timeout: 15000 });
        await expect(alert).toContainText(eventName);
      }

      // Calling again updates the same popup rather than adding another.
      await player.getByRole("button", { name: "Menu" }).click();
      await player.getByRole("menuitem", { name: "Call Director" }).click();
      await player.getByRole("button", { name: "Call Director" }).click();
      await expect(player.getByText(/You have called 2 times/)).toBeVisible({
        timeout: 15000,
      });
      await player.getByRole("button", { name: "OK" }).click();
      await expect(directorA.getByRole("alertdialog")).toContainText(
        "They have called 2 times",
        { timeout: 15000 },
      );
      await expect(
        directorA.getByRole("button", { name: "Dismiss" }),
      ).toHaveCount(1);

      // One director answers: the player hears, the other keeps their popup.
      await directorA.getByRole("button", { name: "Dismiss" }).click();
      await expect(directorA.getByRole("alertdialog")).toHaveCount(0);
      await expect(player.getByText("The director is on the way")).toBeVisible({
        timeout: 15000,
      });
      await expect(directorB.getByRole("alertdialog")).toContainText(
        "Go to Table 1",
      );
    } finally {
      await closeDevices(directorA, directorB, player);
    }
  });
});
