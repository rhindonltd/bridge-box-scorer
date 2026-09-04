import { test, expect } from "@playwright/test";

import { deleteGame } from "../fixtures/delete-game";
import { confirmBoardPassOut } from "../fixtures/play";
import { openDirectorTraveller } from "../fixtures/director-override";
import { newParticipant, setUpStartedTwoTableGame } from "./support";

/**
 * Request-on-mount journey (pure UI, no socket seam).
 *
 * A display or traveller opened AFTER results already exist must show the
 * current state immediately — it requests its snapshot on mount (and joins its
 * feature room) rather than waiting for the next live push. This is the
 * correctness backstop behind the occupancy-gated broadcasts.
 */
test.describe("Results request-on-mount", () => {
  test("late-opened leaderboard and traveller show existing results", async ({
    browser,
  }) => {
    const { directorPage, gameId } = await setUpStartedTwoTableGame(
      browser,
      `Request On Mount ${Date.now()}`,
    );

    const nsPage = await newParticipant(browser);
    const ewPage = await newParticipant(browser);

    try {
      // Confirm board 1 at table 1 BEFORE any display/traveller is open, so
      // there is no live push to rely on — only the mount-time snapshot.
      await confirmBoardPassOut(nsPage, ewPage, gameId, 1, 1);

      // A freshly-opened leaderboard shows standings immediately.
      const displayPage = await newParticipant(browser);
      try {
        await displayPage.goto(`/game/${gameId}/display/leaderboard`);
        await expect(
          displayPage.getByTestId("leaderboard-row").first(),
        ).toBeVisible({ timeout: 15000 });
      } finally {
        await displayPage.context().close();
      }

      // The director's freshly-opened traveller for board 1 shows the
      // confirmed Pass Out (round 1, table 1 -> traveller-row-1-1).
      await openDirectorTraveller(directorPage, gameId, 1);
      await expect(
        directorPage.getByTestId("traveller-row-1-1"),
      ).toContainText("PO", { timeout: 15000 });
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await nsPage.context().close();
      await ewPage.context().close();
    }
  });
});
