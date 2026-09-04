import { test, expect } from "@playwright/test";

import { deleteGame } from "../fixtures/delete-game";
import { enterPassOut } from "../fixtures/play";
import {
  openDirectorTraveller,
  overrideRowToOneNotrump,
} from "../fixtures/director-override";
import { newParticipant, setUpStartedTwoTableGame } from "./support";

/**
 * Live traveller journey with a director override (pure UI, no socket seam).
 *
 * 1. The director opens a board's traveller before it is played: the row shows
 *    no result ("—").
 * 2. Both pairs confirm the board at the table; the director's open traveller
 *    updates live to show the entered result.
 * 3. A player's Board Results page (kept mounted) shows the same result. The
 *    director overrides the row to a different contract, and the player's live
 *    traveller updates to the overridden contract.
 */
test.describe("Traveller live updates and director override", () => {
  test("row updates live on confirm and on override", async ({ browser }) => {
    const { directorPage, gameId } = await setUpStartedTwoTableGame(
      browser,
      `Traveller Live ${Date.now()}`,
    );

    const nsPage = await newParticipant(browser);
    const ewPage = await newParticipant(browser);

    const board = 1;
    const table = 1;

    try {
      // (1) Director opens board 1's traveller before the board is played.
      // Table 1's row is round 1, table 1 -> traveller-row-1-1; it shows "—".
      await openDirectorTraveller(directorPage, gameId, board);
      const directorRow = directorPage.getByTestId(
        `traveller-row-1-${table}`,
      );
      await expect(directorRow).toContainText("\u2014"); // em dash, no result

      // (2) Both pairs enter matching Pass Outs for board 1 at the table. NS
      // waits; EW confirms. The director's already-open traveller updates live.
      await enterPassOut(nsPage, gameId, `A${table}NS`, board);
      await expect(
        nsPage.getByText("Waiting for confirmation"),
      ).toBeVisible();
      await enterPassOut(ewPage, gameId, `A${table}EW`, board);

      // NS lands on Board Results (board confirmed) and stays mounted as our
      // live observer for the override.
      await expect(nsPage.getByText("Board Results")).toBeVisible({
        timeout: 15000,
      });
      await expect(nsPage.getByText("PO")).toBeVisible({ timeout: 15000 });

      // The director's open traveller row now shows the confirmed Pass Out,
      // pushed live (no reload).
      await expect(directorRow).toContainText("PO", { timeout: 15000 });

      // (3) Director overrides the row to 1NT by North making. The override is
      // director-authorised and broadcasts the change.
      await overrideRowToOneNotrump(
        directorPage,
        `traveller-row-1-${table}`,
        true,
      );

      // The player's still-mounted Board Results traveller updates live from
      // the Pass Out to the overridden contract.
      await expect(nsPage.getByText("1NT")).toBeVisible({ timeout: 15000 });
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await nsPage.context().close();
      await ewPage.context().close();
    }
  });
});
