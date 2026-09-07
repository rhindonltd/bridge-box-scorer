import { test, expect } from "@playwright/test";

import { deleteGame } from "../fixtures/delete-game";
import { confirmEntireGame } from "../fixtures/complete-game";
import { setUpStartedTwoTableGame, newParticipant } from "./support";

/**
 * Completed-game redirect journey.
 *
 * Once every playable board has a final result, a game is finished — there is
 * nothing left to join or play. This journey completes a started two-table
 * game and then verifies the three player-facing entry points:
 *
 *  1. the finished game drops off the Join Game list;
 *  2. opening its /join URL directly lands on the leaderboard; and
 *  3. opening a /play/{seat} URL directly lands on the leaderboard.
 *
 * The game is completed via {@link confirmEntireGame} (the same both-sides
 * Pass Out path USEBIO uses) rather than through the play UI.
 */

test.describe("Completed game redirects", () => {
  test("a finished game is hidden from Join and its join/play URLs go to the leaderboard", async ({
    browser,
    request,
  }) => {
    test.setTimeout(120_000);

    const eventName = `Completed Redirect ${Date.now()}`;
    const { directorPage, gameId } = await setUpStartedTwoTableGame(
      browser,
      eventName,
      { recordOpeningLead: false },
    );

    try {
      // Complete every playable board so "all results in".
      await confirmEntireGame(request, gameId);

      const player = await newParticipant(browser);
      try {
        // 1. The finished game does not appear in the Join Game list.
        await player.goto("/join");
        await player.waitForLoadState("networkidle");
        await expect(
          player.getByRole("button", { name: new RegExp(eventName) }),
        ).toHaveCount(0, { timeout: 15000 });

        // 2. Opening the join URL directly redirects to the leaderboard.
        await player.goto(`/game/${gameId}/join`);
        await expect(player).toHaveURL(
          new RegExp(`/game/${gameId}/display/leaderboard$`),
          { timeout: 15000 },
        );
        await expect(
          player.getByText("Leaderboard", { exact: true }),
        ).toBeVisible({ timeout: 15000 });

        // 3. Opening a play/{seat} URL directly also redirects to the
        //    leaderboard. A1NS is a seated seat in the two-table field.
        await player.goto(`/game/${gameId}/play/A1NS`);
        await expect(player).toHaveURL(
          new RegExp(`/game/${gameId}/display/leaderboard$`),
          { timeout: 15000 },
        );
      } finally {
        await player.context().close();
      }
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
    }
  });
});
