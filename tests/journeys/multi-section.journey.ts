import { test, expect } from "@playwright/test";

import { createGame } from "../fixtures/game-create";
import {
  setTableCount,
  openSetupStep,
  addSection,
  selectSection,
} from "../fixtures/game-setup";
import { confirmBoardPassOut } from "../fixtures/play";
import { deleteGame } from "../fixtures/delete-game";
import {
  closeSeatDevices,
  newParticipant,
  setUpStartedTwoSectionGame,
} from "./support";

/**
 * Multi-section journeys (pure UI, no socket seam).
 *
 * Covers the section-specific surfaces a single-section game never exercises:
 *   1. Section CRUD in setup — add a second section, rename it, delete it.
 *   2. A started two-section game: play a board in EACH section, then assert
 *      the leaderboard display shows Combined + per-section tabs with each
 *      section's own standings, and the timer display shows the section
 *      chooser.
 */

test.describe("Multi-section setup CRUD", () => {
  test("a director can add, rename, and delete a second section", async ({
    browser,
  }) => {
    test.setTimeout(90_000);

    const directorPage = await newParticipant(browser);
    const { gameId } = await createGame(directorPage, {
      eventName: `Section CRUD ${Date.now()}`,
      recordOpeningLead: false,
    });

    try {
      await setTableCount(directorPage, 2);

      // Add a second section via the "+ Add section" pill + naming modal.
      await openSetupStep(directorPage, "Movement");
      await addSection(directorPage);

      // Both sections now appear as pills.
      await expect(
        directorPage.getByRole("tab", { name: /Section A/ }),
      ).toBeVisible({ timeout: 15000 });
      await expect(
        directorPage.getByRole("tab", { name: /Section B/ }),
      ).toBeVisible();

      // Rename / delete live in the selected section's header on the Tables
      // screen. Select section B, rename it via its "Section label" field
      // (commits on blur) and watch the pill pick up the new name.
      await openSetupStep(directorPage, "Tables");
      await selectSection(directorPage, "B");
      const labelField = directorPage.getByLabel("Section label");
      await labelField.fill("Afternoon");
      await labelField.blur();
      await expect(
        directorPage.getByRole("tab", { name: /Section B — Afternoon/ }),
      ).toBeVisible({ timeout: 15000 });

      // Delete section B (accept the confirm dialog); the section pills go
      // away because the game is back to a single section.
      directorPage.once("dialog", (d) => d.accept());
      await directorPage
        .getByRole("button", { name: "Delete section" })
        .click();
      await expect(directorPage.getByRole("tab", { name: /Section B/ })).toHaveCount(
        0,
        { timeout: 15000 },
      );
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
    }
  });
});

test.describe("Multi-section play and displays", () => {
  test("two sections show combined + per-section standings and a timer chooser", async ({
    browser,
  }) => {
    test.setTimeout(180_000);

    const { directorPage, gameId, seats } = await setUpStartedTwoSectionGame(
      browser,
      `Two Sections ${Date.now()}`,
    );

    const nsA = seats["A1NS"];
    const ewA = seats["A1EW"];
    const nsB = seats["B1NS"];
    const ewB = seats["B1EW"];
    const displayPage = await newParticipant(browser);

    try {
      // Play (confirm) a board at table 1 in BOTH sections.
      await confirmBoardPassOut(nsA, ewA, gameId, 1, 1, "A");
      await confirmBoardPassOut(nsB, ewB, gameId, 1, 1, "B");

      // Leaderboard display: multi-section shows Combined + Section A/B tabs.
      await displayPage.goto(`/game/${gameId}/display/leaderboard`);
      await expect(
        displayPage.getByRole("button", { name: "Combined" }),
      ).toBeVisible({ timeout: 15000 });
      await expect(
        displayPage.getByRole("button", { name: "Section A" }),
      ).toBeVisible();
      await expect(
        displayPage.getByRole("button", { name: "Section B" }),
      ).toBeVisible();

      // Combined view shows standings rows (both sections' pairs).
      await expect(
        displayPage.getByTestId("leaderboard-standings"),
      ).toBeVisible({ timeout: 15000 });
      await expect(
        displayPage.getByTestId("leaderboard-row").first(),
      ).toBeVisible({ timeout: 15000 });

      // Section A tab shows its own standings.
      await displayPage.getByRole("button", { name: "Section A" }).click();
      await expect(
        displayPage.getByTestId("leaderboard-row").first(),
      ).toBeVisible({ timeout: 15000 });

      // Section B tab shows its own standings.
      await displayPage.getByRole("button", { name: "Section B" }).click();
      await expect(
        displayPage.getByTestId("leaderboard-row").first(),
      ).toBeVisible({ timeout: 15000 });

      // Timer display: multi-section shows the section chooser.
      await displayPage.goto(`/game/${gameId}/display/timer`);
      await expect(displayPage.getByText("Choose a section")).toBeVisible({
        timeout: 15000,
      });
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await displayPage.context().close();
      await closeSeatDevices(seats);
    }
  });
});
