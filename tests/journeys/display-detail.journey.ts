import { test, expect } from "@playwright/test";

import { deleteGame } from "../fixtures/delete-game";
import { confirmBoardPassOut } from "../fixtures/play";
import {
  newParticipant,
  setUpStartedTwoTableGame,
  setUpStartedTwoSectionGame,
} from "./support";

/**
 * Leaderboard & traveller display-detail journey.
 *
 * Covers the section/combined structure of the room-display leaderboard and the
 * player-facing traveller detail that the coarser play journeys skip:
 *
 *  - A single-section game's display leaderboard shows NO Combined/Section tabs
 *    (the combined standings are the only view).
 *  - A two-section game's display leaderboard shows a Combined tab (default,
 *    aria-pressed) plus one tab per section, and switching sections updates the
 *    pressed tab live.
 *  - On a player's Board Results, the traveller highlights that pair's OWN row
 *    (data-highlighted="true") — distinct from the Game Complete leaderboard
 *    highlight already covered elsewhere.
 */
test.describe("Leaderboard & traveller display detail", () => {
  test("single-section display leaderboard shows standings and no section tabs", async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    const { directorPage, gameId } = await setUpStartedTwoTableGame(
      browser,
      `Display Single ${Date.now()}`,
      { recordOpeningLead: false },
    );
    const displayPage = await newParticipant(browser);

    try {
      await displayPage.goto(`/game/${gameId}/display/leaderboard`);

      // Single-section: standings render and the tab bar is absent (the tabs
      // only appear when sections.length > 1).
      await expect(
        displayPage.getByTestId("leaderboard-standings"),
      ).toBeVisible({ timeout: 15000 });
      await expect(
        displayPage.getByRole("button", { name: "Combined" }),
      ).toHaveCount(0);
      await expect(
        displayPage.getByRole("button", { name: "Section A" }),
      ).toHaveCount(0);
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await displayPage.context().close();
    }
  });

  test("two-section display leaderboard shows Combined + section tabs and switches", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const { directorPage, gameId } = await setUpStartedTwoSectionGame(
      browser,
      `Display Sections ${Date.now()}`,
    );
    const displayPage = await newParticipant(browser);

    try {
      await displayPage.goto(`/game/${gameId}/display/leaderboard`);

      // Multi-section: Combined is the default (pressed) tab, and each section
      // has its own tab.
      const combined = displayPage.getByRole("button", { name: "Combined" });
      const sectionA = displayPage.getByRole("button", { name: "Section A" });
      const sectionB = displayPage.getByRole("button", { name: "Section B" });
      await expect(combined).toBeVisible({ timeout: 15000 });
      await expect(sectionA).toBeVisible();
      await expect(sectionB).toBeVisible();
      await expect(combined).toHaveAttribute("aria-pressed", "true");

      // Switching to Section A moves the pressed state live (no reload).
      await sectionA.click();
      await expect(sectionA).toHaveAttribute("aria-pressed", "true");
      await expect(combined).toHaveAttribute("aria-pressed", "false");

      // And back to Combined.
      await combined.click();
      await expect(combined).toHaveAttribute("aria-pressed", "true");
      await expect(sectionA).toHaveAttribute("aria-pressed", "false");
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await displayPage.context().close();
    }
  });

  test("a player's Board Results traveller highlights their own pair row", async ({
    browser,
    request,
  }) => {
    test.setTimeout(90_000);
    const { directorPage, gameId } = await setUpStartedTwoTableGame(
      browser,
      `Display Own Row ${Date.now()}`,
      { recordOpeningLead: false },
    );
    const nsPage = await newParticipant(browser);
    const ewPage = await newParticipant(browser);

    try {
      // Confirm board 1 at table 1 so the NS pair lands on Board Results with a
      // populated traveller.
      await confirmBoardPassOut(nsPage, ewPage, gameId, 1, 1);
      await expect(nsPage.getByText("Board Results")).toBeVisible({
        timeout: 15000,
      });

      // Board Results passes the pair's assignment id as highlightAssignmentId,
      // so the pair's own traveller row carries data-highlighted="true" and its
      // cells show that assignment id.
      const scheduleRes = await request.get(
        `/api/games/${gameId}/schedule/A1NS`,
      );
      expect(scheduleRes.ok()).toBeTruthy();
      const assignmentId: string = (await scheduleRes.json()).result
        .assignmentId;

      const highlightedRow = nsPage.locator(
        '[data-highlighted="true"]',
      );
      await expect(highlightedRow.first()).toBeVisible({ timeout: 15000 });
      await expect(highlightedRow.first()).toContainText(assignmentId);
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await nsPage.context().close();
      await ewPage.context().close();
    }
  });
});
