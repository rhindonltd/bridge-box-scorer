import { test, expect } from "@playwright/test";

import { createGame } from "../fixtures/game-create";
import { setTableCount } from "../fixtures/game-setup";
import { confirmBoardPassOut } from "../fixtures/play";
import { deleteGame } from "../fixtures/delete-game";
import { newParticipant, setUpStartedTwoSectionGame } from "./support";

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

      // Movement tab -> single-section picker with the "Add Section" banner.
      await directorPage.getByRole("tab", { name: "Movement" }).click();
      await directorPage.getByRole("button", { name: "Add Section" }).click();

      // Now multi-section: the SectionManager lists Section A and Section B.
      await expect(
        directorPage.getByText("Section A", { exact: true }),
      ).toBeVisible({ timeout: 15000 });
      await expect(
        directorPage.getByText("Section B", { exact: true }),
      ).toBeVisible();

      // Rename section B via its Label field (commits on blur). The
      // SectionManager keeps the label in its "Label" textbox (the combined
      // "Section B — Afternoon" heading only appears on join/leaderboard).
      const labelFields = directorPage.getByLabel("Label");
      await labelFields.nth(1).fill("Afternoon");
      await labelFields.nth(1).blur();
      await expect(labelFields.nth(1)).toHaveValue("Afternoon", {
        timeout: 15000,
      });

      // Delete section B (accept the confirm dialog); the list returns to a
      // single-section view (no "Section B" heading).
      directorPage.once("dialog", (d) => d.accept());
      await directorPage.getByRole("button", { name: "Delete" }).nth(1).click();
      await expect(
        directorPage.getByText("Section B", { exact: true }),
      ).toBeHidden({ timeout: 15000 });
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

    const { directorPage, gameId } = await setUpStartedTwoSectionGame(
      browser,
      `Two Sections ${Date.now()}`,
    );

    const nsA = await newParticipant(browser);
    const ewA = await newParticipant(browser);
    const nsB = await newParticipant(browser);
    const ewB = await newParticipant(browser);
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
      await nsA.context().close();
      await ewA.context().close();
      await nsB.context().close();
      await ewB.context().close();
      await displayPage.context().close();
    }
  });
});
