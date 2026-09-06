import { test, expect } from "@playwright/test";

import { deleteGame } from "../fixtures/delete-game";
import {
  ContractSpec,
  confirmBoardPlayedContract,
  enterPlayedContract,
} from "../fixtures/play";
import { confirmEntireGame } from "../fixtures/complete-game";
import { newParticipant, setUpStartedTwoTableGame } from "./support";

/**
 * Played-contract journey (pure UI, no socket seam).
 *
 * Closes the P1 gap where only Pass Out was ever entered end to end. Both pairs
 * at a table enter the SAME real contract (level/suit/declarer/lead/result)
 * through the full ContractWizard; the board confirms live and the confirmed
 * contract propagates to a mounted leaderboard display and shows on the pair's
 * Board Results. Covers the opening-lead step both ON (default) and OFF (via
 * the create toggle), and plays one table through to the Game Complete screen.
 */

/** A representative made contract: 4♥ by North, making exactly. */
const FOUR_HEARTS: ContractSpec = {
  level: 4,
  suit: "H",
  declarer: "N",
  result: { mode: "made", value: 0 },
};

test.describe("Played contract entry, confirmation and completion", () => {
  test("both pairs enter a real contract; it confirms live and shows on the leaderboard", async ({
    browser,
  }) => {
    test.setTimeout(90_000);

    // Lead recording ON (the app default): the wizard includes the lead step.
    const { directorPage, gameId } = await setUpStartedTwoTableGame(
      browser,
      `Played Contract ${Date.now()}`,
    );

    const displayPage = await newParticipant(browser);
    const nsPage = await newParticipant(browser);
    const ewPage = await newParticipant(browser);

    try {
      // A leaderboard display mounted before any result: empty standings.
      await displayPage.goto(`/game/${gameId}/display/leaderboard`);
      await expect(
        displayPage.getByTestId("leaderboard-standings"),
      ).toBeVisible({ timeout: 15000 });
      await expect(displayPage.getByTestId("leaderboard-row")).toHaveCount(0);

      // Both pairs at table 1 enter 4♥ by North making, walking the full
      // wizard including the opening-lead step.
      await confirmBoardPlayedContract(
        nsPage,
        ewPage,
        gameId,
        1,
        1,
        FOUR_HEARTS,
        { leadCardRequired: true },
      );

      // The confirmed contract shows on the NS pair's Board Results traveller.
      // The board number 4 is the contract level; assert the traveller rendered
      // the heart-suit contract row by its glyph rather than a bare digit.
      await expect(nsPage.getByText("Board Results")).toBeVisible({
        timeout: 15000,
      });
      await expect(nsPage.getByText("\u2665").first()).toBeVisible({
        timeout: 15000,
      });

      // The mounted leaderboard display gains a standing row live.
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

  test("with opening-lead recording OFF, the wizard skips the lead step", async ({
    browser,
  }) => {
    test.setTimeout(90_000);

    // Lead recording OFF: the wizard must go declarer -> result with no lead.
    const { directorPage, gameId } = await setUpStartedTwoTableGame(
      browser,
      `Played No Lead ${Date.now()}`,
      { recordOpeningLead: false },
    );

    const nsPage = await newParticipant(browser);
    const ewPage = await newParticipant(browser);

    try {
      // enterPlayedContract with leadCardRequired:false never looks for the
      // lead "Next" button; reaching "Waiting for confirmation" proves the
      // wizard skipped straight from declarer to result to confirm.
      await enterPlayedContract(nsPage, gameId, "A1NS", 1, FOUR_HEARTS, {
        leadCardRequired: false,
      });
      await expect(nsPage.getByText("Waiting for confirmation")).toBeVisible({
        timeout: 15000,
      });

      // The lead step never rendered: no "Next" (lead) control was present.
      // (If it had, the helper above would have timed out on the missing lead.)
      await enterPlayedContract(ewPage, gameId, "A1EW", 1, FOUR_HEARTS, {
        leadCardRequired: false,
      });
      await expect(nsPage.getByText("Board Results")).toBeVisible({
        timeout: 15000,
      });
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await nsPage.context().close();
      await ewPage.context().close();
    }
  });

  test("playing the whole game drives a pair to the Game Complete screen", async ({
    browser,
    request,
  }) => {
    test.setTimeout(120_000);

    const { directorPage, gameId } = await setUpStartedTwoTableGame(
      browser,
      `Play To Complete ${Date.now()}`,
      { recordOpeningLead: false },
    );

    const nsPage = await newParticipant(browser);

    try {
      // Confirm every non-sit-out board instance in the game (both sides) so
      // every pair's schedule is complete. A Howell rotates opponents each
      // round, so following one pair through the UI is brittle; instead we
      // confirm the whole board set deterministically, then assert the UI.
      await confirmEntireGame(request, gameId);

      // The round-1 NS pair keeps its URL seat all game; once its schedule is
      // fully confirmed the play page resolves straight to Game Complete.
      await nsPage.goto(`/game/${gameId}/play/A1NS`);
      await expect(nsPage.getByText("Game Complete")).toBeVisible({
        timeout: 15000,
      });

      // The Game Complete screen shows the final leaderboard with the pair's
      // OWN row highlighted (GameComplete passes highlightAssignmentId). The
      // pair's assignment id comes from its schedule; the highlighted row
      // carries data-highlighted="true" and its Pair cell shows that id.
      const scheduleRes = await request.get(
        `/api/games/${gameId}/schedule/A1NS`,
      );
      expect(scheduleRes.ok()).toBeTruthy();
      const assignmentId: string = (await scheduleRes.json()).result
        .assignmentId;

      const highlightedRow = nsPage.locator(
        '[data-testid="leaderboard-row"][data-highlighted="true"]',
      );
      await expect(highlightedRow).toHaveCount(1, { timeout: 15000 });
      await expect(highlightedRow).toContainText(assignmentId);
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await nsPage.context().close();
    }
  });
});
