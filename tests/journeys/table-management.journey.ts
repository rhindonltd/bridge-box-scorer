import { test, expect, Page } from "@playwright/test";

import { createGame } from "../fixtures/game-create";
import {
  setTableCount,
  pickFirstMovement,
  openSetupStep,
} from "../fixtures/game-setup";
import { seatPair, SEEDED_EBU } from "../fixtures/join";
import { deleteGame } from "../fixtures/delete-game";
import { newParticipant } from "./support";

/**
 * Director table-management journey (pure UI, no socket seam).
 *
 * On the setup Tables view the director can resize a section (NumberStepper ->
 * HTTP PUT .../sections/[section]/tables), evict a seated pair (confirm dialog
 * -> HTTP DELETE .../participants/[seat]),
 * and is prevented from removing a table that still seats a pair (the shrink
 * guard is server-enforced and surfaced as an alert).
 */

// The Tables NumberStepper exposes its controls via aria-labels (the visible
// −/+ glyphs are decorative) and its current value via a "Tables" spinbutton.
const DECREASE_TABLES = "Decrease Tables";
const INCREASE_TABLES = "Increase Tables";

/** Open the setup Tables view for a game. */
async function openTablesTab(page: Page, gameId: string): Promise<void> {
  await page.goto(`/game/${gameId}/create`);
  await openSetupStep(page, "Tables");
}

/** Read the (single-section) table count from the Tables spinbutton. */
async function readTableCount(page: Page): Promise<number> {
  const value = await page
    .getByRole("spinbutton", { name: "Tables" })
    .inputValue();
  return Number(value);
}

test.describe("Director table management", () => {
  test("resizing a section adds and removes a table", async ({ browser }) => {
    const directorPage = await newParticipant(browser);
    const { gameId } = await createGame(directorPage, {
      eventName: `Resize ${Date.now()}`,
      recordOpeningLead: false,
    });

    try {
      await setTableCount(directorPage, 2);
      await openTablesTab(directorPage, gameId);

      // Two tables to start.
      await expect
        .poll(() => readTableCount(directorPage), { timeout: 15000 })
        .toBe(2);

      // Increment to three tables.
      await directorPage
        .getByRole("button", { name: INCREASE_TABLES, exact: true })
        .click();
      await expect
        .poll(() => readTableCount(directorPage), { timeout: 15000 })
        .toBe(3);

      // Decrement back to two (the third table is empty, so this is allowed).
      await directorPage
        .getByRole("button", { name: DECREASE_TABLES, exact: true })
        .click();
      await expect
        .poll(() => readTableCount(directorPage), { timeout: 15000 })
        .toBe(2);
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
    }
  });

  test("evicting a pair frees the seat", async ({ browser }) => {
    const directorPage = await newParticipant(browser);
    const { gameId } = await createGame(directorPage, {
      eventName: `Evict ${Date.now()}`,
      recordOpeningLead: false,
    });

    try {
      await setTableCount(directorPage, 2);
      await pickFirstMovement(directorPage);

      // Seat one pair at table 1 NS.
      const { jacquelineCollier, davidCollier } = SEEDED_EBU;
      await seatPair(directorPage, gameId, 0, "NS", jacquelineCollier, davidCollier);

      await openTablesTab(directorPage, gameId);

      // The seated North player has an evict control ("Evict North player").
      const evictNorth = directorPage.getByRole("button", {
        name: "Evict North player",
      });
      await expect(evictNorth).toBeVisible({ timeout: 15000 });

      // Eviction is guarded by a confirm() dialog; accept it.
      directorPage.once("dialog", (d) => d.accept());
      await evictNorth.click();

      // Once evicted, the seat is empty again: the North evict control is gone
      // (an empty PlayerCard has no evict button).
      await expect(evictNorth).toBeHidden({ timeout: 15000 });
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
    }
  });

  test("a table that still seats a pair cannot be removed", async ({
    browser,
  }) => {
    const directorPage = await newParticipant(browser);
    const { gameId } = await createGame(directorPage, {
      eventName: `Remove Guard ${Date.now()}`,
      recordOpeningLead: false,
    });

    try {
      await setTableCount(directorPage, 2);
      await pickFirstMovement(directorPage);

      // Seat a pair on the LAST table (table 2) so shrinking would drop a
      // seated table. The server rejects this with an alert.
      const { celiaOram, denisKing } = SEEDED_EBU;
      await seatPair(directorPage, gameId, 1, "NS", celiaOram, denisKing);

      await openTablesTab(directorPage, gameId);
      await expect
        .poll(() => readTableCount(directorPage), { timeout: 15000 })
        .toBe(2);

      // Removing a table would drop the seated last table, so the shrink guard
      // DISABLES the decrement control (the director can't even attempt it).
      const decrease = directorPage.getByRole("button", {
        name: DECREASE_TABLES,
        exact: true,
      });
      await expect(decrease).toBeDisabled({ timeout: 15000 });

      // The count therefore stays at two.
      await expect
        .poll(() => readTableCount(directorPage), { timeout: 15000 })
        .toBe(2);
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
    }
  });
});
