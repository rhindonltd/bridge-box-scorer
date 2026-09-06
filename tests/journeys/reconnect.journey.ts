import { test, expect } from "@playwright/test";

import { deleteGame } from "../fixtures/delete-game";
import { confirmBoardPassOut } from "../fixtures/play";
import { newParticipant, setUpStartedTwoTableGame } from "./support";

/**
 * Reconnect recovery journey (pure UI, no socket seam).
 *
 * The socket-only feature contexts (leaderboard, traveller, timer) re-request
 * their snapshot on `socket.on("connect")`, so a client that drops its
 * connection and reconnects recovers the current state without a reload. This
 * journey drops the display's network (context.setOffline) after standings are
 * showing, restores it, and asserts the leaderboard is still populated —
 * proving the request-on-reconnect path, not just request-on-mount.
 */

test.describe("Reconnect recovery", () => {
  test("a leaderboard display recovers standings after a socket drop", async ({
    browser,
  }) => {
    test.setTimeout(90_000);

    const { directorPage, gameId } = await setUpStartedTwoTableGame(
      browser,
      `Reconnect ${Date.now()}`,
      { recordOpeningLead: false },
    );

    const displayPage = await newParticipant(browser);
    const nsPage = await newParticipant(browser);
    const ewPage = await newParticipant(browser);

    try {
      // Confirm a board so there are standings to recover.
      await confirmBoardPassOut(nsPage, ewPage, gameId, 1, 1);

      // Open the leaderboard display and wait for a standing row.
      await displayPage.goto(`/game/${gameId}/display/leaderboard`);
      await expect(
        displayPage.getByTestId("leaderboard-row").first(),
      ).toBeVisible({ timeout: 15000 });

      // Drop the display's connection: the websocket disconnects.
      await displayPage.context().setOffline(true);
      await displayPage.waitForTimeout(1500);

      // Restore connectivity: socket.io reconnects and the LeaderboardProvider
      // re-requests its snapshot on "connect".
      await displayPage.context().setOffline(false);

      // The standings are still shown after reconnect. Confirm another board
      // to prove live updates resume too (the re-joined room receives pushes).
      await confirmBoardPassOut(nsPage, ewPage, gameId, 1, 2);

      await expect(
        displayPage.getByTestId("leaderboard-standings"),
      ).toBeVisible({ timeout: 20000 });
      await expect(
        displayPage.getByTestId("leaderboard-row").first(),
      ).toBeVisible({ timeout: 20000 });
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await displayPage.context().close();
      await nsPage.context().close();
      await ewPage.context().close();
    }
  });
});
