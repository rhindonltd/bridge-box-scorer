import { test, expect, Browser } from "@playwright/test";

import { createGame } from "../fixtures/game-create";
import {
  setTableCount,
  pickMovementByName,
  startGame,
} from "../fixtures/game-setup";
import { seatSingleSectionFieldOnDevices } from "../fixtures/join";
import { confirmBoardPassOut } from "../fixtures/play";
import { deleteGame } from "../fixtures/delete-game";
import { closeSeatDevices, newParticipant } from "./support";

/**
 * Movement-type coverage (pure UI, no socket seam).
 *
 * The setup movement picker offers curated recommendations per table count.
 * This journey selects a specific movement FAMILY by name, seats a full field,
 * starts, and confirms a board — proving each movement type materialises into a
 * playable game.
 *
 * Table counts are chosen from what the recommendation picker actually offers
 * (verified against /api/movements/pairs and the recommendation spec map):
 *   - Howell:   offered at 2 tables ("Two Table Full Howell").
 *   - Mitchell: "Standard Mitchell" offered at 3 tables.
 *
 * American Whist is intentionally NOT covered here: it is absent from the
 * recommendation spec map, so it is not selectable through the picker UI at any
 * table count (documented as a gap in the coverage audit).
 */

/**
 * Create a single-section game, choose the named movement, seat every seat,
 * start, and confirm board 1 at table 1 — asserting the movement plays.
 */
async function playMovement(
  browser: Browser,
  eventName: string,
  tables: number,
  movementName: string,
): Promise<void> {
  const directorPage = await newParticipant(browser);

  const { gameId } = await createGame(directorPage, {
    eventName,
    recordOpeningLead: false,
  });

  let seats: Record<string, import("@playwright/test").Page> = {};
  try {
    await setTableCount(directorPage, tables);
    const chosen = await pickMovementByName(directorPage, movementName);
    expect(chosen.toLowerCase()).toContain(movementName.toLowerCase());

    // Seat every pair from its own device so the playing pair holds its token.
    seats = await seatSingleSectionFieldOnDevices(
      () => newParticipant(browser),
      gameId,
      tables,
    );
    await startGame(directorPage, gameId);

    // The movement materialised into a schedule: a board can be confirmed.
    const nsPage = seats["A1NS"];
    const ewPage = seats["A1EW"];
    await confirmBoardPassOut(nsPage, ewPage, gameId, 1, 1);
    await expect(nsPage.getByText("Board Results")).toBeVisible({
      timeout: 15000,
    });
  } finally {
    await deleteGame(directorPage, gameId);
    await directorPage.context().close();
    await closeSeatDevices(seats);
  }
}

test.describe("Movement types materialise into playable games", () => {
  test("Howell (2 tables) sets up and plays", async ({ browser }) => {
    test.setTimeout(120_000);
    await playMovement(browser, `Howell ${Date.now()}`, 2, "Howell");
  });

  test("Standard Mitchell (3 tables) sets up and plays", async ({ browser }) => {
    test.setTimeout(120_000);
    await playMovement(browser, `Mitchell ${Date.now()}`, 3, "Mitchell");
  });
});
