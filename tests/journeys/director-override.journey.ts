import { test, expect } from "@playwright/test";

import { deleteGame } from "../fixtures/delete-game";
import { enterPassOut } from "../fixtures/play";
import {
  openDirectorTraveller,
  overrideRowToContract,
  overrideRowToAdjusted,
  overrideRowToAdjustedPreset,
} from "../fixtures/director-override";
import { newParticipant, setUpStartedTwoTableGame } from "./support";

/**
 * Director override journeys (pure UI, no socket seam).
 *
 * Broadens director-correction coverage beyond the Pass Out -> 1NT case:
 *   1. Override a confirmed board to a suited, DOUBLED played contract and
 *      assert a mounted player's Board Results traveller updates live.
 *   2. Override a confirmed board to an ADJUSTED score (custom NS%/EW%) and
 *      assert the player's traveller shows the "Adj NN%/MM%" rendering.
 *
 * Games record no opening lead so the wizard is short; the override wizard has
 * its own lead handling controlled via the fixture's leadCardRequired flag.
 */

test.describe("Director overrides", () => {
  test("overriding a board to a doubled suited contract updates the player live", async ({
    browser,
  }) => {
    test.setTimeout(90_000);

    const { directorPage, gameId } = await setUpStartedTwoTableGame(
      browser,
      `Director Contract Override ${Date.now()}`,
      { recordOpeningLead: false },
    );

    const nsPage = await newParticipant(browser);
    const ewPage = await newParticipant(browser);
    const board = 1;
    const table = 1;

    try {
      // Both pairs confirm board 1 as a Pass Out; NS stays mounted on Board
      // Results as our live observer.
      await enterPassOut(nsPage, gameId, `A${table}NS`, board);
      await expect(nsPage.getByText("Waiting for confirmation")).toBeVisible();
      await enterPassOut(ewPage, gameId, `A${table}EW`, board);
      await expect(nsPage.getByText("Board Results")).toBeVisible({
        timeout: 15000,
      });

      // Director opens the board's traveller and overrides table 1's row
      // (round 1, table 1 -> traveller-row-1-1) to 3♠ X by North, making.
      await openDirectorTraveller(directorPage, gameId, board);
      await overrideRowToContract(
        directorPage,
        `traveller-row-1-${table}`,
        {
          level: 3,
          suit: "S",
          declarer: "N",
          doubling: "X",
          result: { mode: "made", value: 0 },
        },
        { leadCardRequired: false },
      );

      // The player's still-mounted Board Results traveller updates live from
      // the Pass Out to the overridden contract (spade glyph + double).
      await expect(nsPage.getByText(/3.*X.*N/).first()).toBeVisible({
        timeout: 15000,
      });
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await nsPage.context().close();
      await ewPage.context().close();
    }
  });

  test("overriding a board to an adjusted score updates the player live", async ({
    browser,
  }) => {
    test.setTimeout(90_000);

    const { directorPage, gameId } = await setUpStartedTwoTableGame(
      browser,
      `Director Adjusted Override ${Date.now()}`,
      { recordOpeningLead: false },
    );

    const nsPage = await newParticipant(browser);
    const ewPage = await newParticipant(browser);
    const board = 1;
    const table = 1;

    try {
      await enterPassOut(nsPage, gameId, `A${table}NS`, board);
      await expect(nsPage.getByText("Waiting for confirmation")).toBeVisible();
      await enterPassOut(ewPage, gameId, `A${table}EW`, board);
      await expect(nsPage.getByText("Board Results")).toBeVisible({
        timeout: 15000,
      });

      // Director overrides the row to an adjusted 60/40 split.
      await openDirectorTraveller(directorPage, gameId, board);
      await overrideRowToAdjusted(directorPage, `traveller-row-1-${table}`, {
        nsPercent: 60,
        ewPercent: 40,
      });

      // An adjusted score carries no matchpoint score, so it does NOT appear in
      // the player's scored (MP) traveller — but the director's traveller
      // renders the stored result directly. Re-open the board's traveller and
      // assert the row shows the adjusted rendering "Adj 60%/40%".
      await openDirectorTraveller(directorPage, gameId, board);
      await expect(
        directorPage
          .getByTestId(`traveller-row-1-${table}`)
          .getByText(/Adj\s*60%\/40%/),
      ).toBeVisible({ timeout: 15000 });
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await nsPage.context().close();
      await ewPage.context().close();
    }
  });

  test("an adjusted-score PRESET applies and propagates to a second director viewer", async ({
    browser,
  }) => {
    test.setTimeout(90_000);

    const { directorPage, gameId } = await setUpStartedTwoTableGame(
      browser,
      `Director Adjusted Preset ${Date.now()}`,
      { recordOpeningLead: false },
    );

    // A second director-authorised viewer: reuse the director's storageState
    // (which holds the director token for this game) in a fresh context, then
    // open the same board's traveller as a live observer.
    const viewerContext = await browser.newContext({
      ...test.info().project.use,
      storageState: await directorPage.context().storageState(),
    });
    const viewerPage = await viewerContext.newPage();

    const nsPage = await newParticipant(browser);
    const ewPage = await newParticipant(browser);
    const board = 1;
    const table = 1;

    try {
      await enterPassOut(nsPage, gameId, `A${table}NS`, board);
      await expect(nsPage.getByText("Waiting for confirmation")).toBeVisible();
      await enterPassOut(ewPage, gameId, `A${table}EW`, board);
      await expect(nsPage.getByText("Board Results")).toBeVisible({
        timeout: 15000,
      });

      // The second director viewer opens the same board's traveller and stays
      // mounted; the row shows the table-entered Pass Out first.
      await openDirectorTraveller(viewerPage, gameId, board);
      await expect(
        viewerPage.getByTestId(`traveller-row-1-${table}`),
      ).toContainText("PO", { timeout: 15000 });

      // The first director applies the "AVE+ / AVE-  (60/40)" PRESET (which
      // submits immediately, no custom entry).
      await openDirectorTraveller(directorPage, gameId, board);
      await overrideRowToAdjustedPreset(
        directorPage,
        `traveller-row-1-${table}`,
        { nsPercent: 60, ewPercent: 40 },
      );

      // The still-mounted second viewer's traveller updates live to the
      // adjusted rendering — no reload.
      await expect(
        viewerPage
          .getByTestId(`traveller-row-1-${table}`)
          .getByText(/Adj\s*60%\/40%/),
      ).toBeVisible({ timeout: 15000 });
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await viewerContext.close();
      await nsPage.context().close();
      await ewPage.context().close();
    }
  });
});
