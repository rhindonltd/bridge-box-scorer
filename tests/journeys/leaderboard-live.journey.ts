import { test, expect } from "@playwright/test";

import { deleteGame } from "../fixtures/delete-game";
import { confirmBoardPassOut } from "../fixtures/play";
import { newParticipant, setUpStartedTwoTableGame } from "./support";

/**
 * Live leaderboard journey (pure UI, no socket seam).
 *
 * A leaderboard display opened before any board is played shows the empty
 * state. When a pair result is confirmed at the table, the display updates
 * live to standings — proving the socket-only, occupancy-gated broadcast
 * reaches an already-mounted display.
 */
test.describe("Leaderboard live updates", () => {
  test("empty display fills with standings when a board is confirmed", async ({
    browser,
  }) => {
    const { directorPage, gameId } = await setUpStartedTwoTableGame(
      browser,
      `Leaderboard Live ${Date.now()}`,
    );

    const displayPage = await newParticipant(browser);
    const nsPage = await newParticipant(browser);
    const ewPage = await newParticipant(browser);

    try {
      // Open the display BEFORE any result exists: the standings table renders
      // but has no pair rows yet.
      await displayPage.goto(`/game/${gameId}/display/leaderboard`);
      await expect(
        displayPage.getByTestId("leaderboard-standings"),
      ).toBeVisible({ timeout: 15000 });
      await expect(displayPage.getByTestId("leaderboard-row")).toHaveCount(0);

      // Two pairs at table 1 confirm board 1 through the real play UI.
      await confirmBoardPassOut(nsPage, ewPage, gameId, 1, 1);

      // The already-open display gains standing rows live, without reloading.
      await expect(
        displayPage.getByTestId("leaderboard-row").first(),
      ).toBeVisible({ timeout: 15000 });
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await displayPage.context().close();
      await nsPage.context().close();
      await ewPage.context().close();
    }
  });
});
