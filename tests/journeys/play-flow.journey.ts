import { test, expect } from "@playwright/test";

import { deleteGame } from "../fixtures/delete-game";
import { enterPassOut, confirmBoardPassOut } from "../fixtures/play";
import { newParticipant, setUpStartedTwoTableGame } from "./support";

/**
 * Play-flow mount & board-dropdown journey (pure UI, no socket seam).
 *
 * Covers two things the coarser play journeys skip:
 *
 *  - The ContractWizard's board dropdown (shown once past the board-select
 *    step) lets a player switch which board they are entering mid-flow.
 *  - usePlayFlow.initialPlayState resolves to the FIRST INCOMPLETE round on a
 *    fresh mount: after a pair confirms every board of round 1, reloading the
 *    play page lands on round 2's round-info (not back at round 1).
 */

interface Schedule {
  rounds: { roundNumber: number; boards: number[] }[];
}

test.describe("Play flow mount & board dropdown", () => {
  test("the board dropdown switches the board being entered mid-flow", async ({
    browser,
    request,
  }) => {
    test.setTimeout(90_000);

    const { directorPage, gameId } = await setUpStartedTwoTableGame(
      browser,
      `Play Board Dropdown ${Date.now()}`,
      { recordOpeningLead: false },
    );
    const nsPage = await newParticipant(browser);

    try {
      // Read round 1's board numbers from the schedule so the test adapts to
      // the movement. The dropdown switch needs at least two boards in the
      // round.
      const res = await request.get(`/api/games/${gameId}/schedule/A1NS`);
      expect(res.ok()).toBeTruthy();
      const schedule: Schedule = (await res.json()).result;
      const round1 = schedule.rounds.find((r) => r.roundNumber === 1);
      expect(round1).toBeTruthy();
      const boards = round1!.boards;
      test.skip(
        boards.length < 2,
        "round 1 has a single board; dropdown switch needs two",
      );
      const [firstBoard, secondBoard] = boards;

      // Open the round and pick the first board -> the wizard leaves the board
      // step and the board dropdown appears reading "Board {firstBoard}".
      await nsPage.goto(`/game/${gameId}/play/A1NS`);
      await nsPage.getByTestId("play-enter-round").click();
      await nsPage.getByTestId(`wizard-board-${firstBoard}`).click();

      const dropdownButton = nsPage.getByRole("button", {
        name: new RegExp(`^Board ${firstBoard}`),
      });
      await expect(dropdownButton).toBeVisible({ timeout: 15000 });

      // Open the dropdown and switch to the second board.
      await dropdownButton.click();
      await nsPage
        .getByRole("button", { name: `Board ${secondBoard}`, exact: true })
        .click();

      // The dropdown trigger now reflects the newly selected board.
      await expect(
        nsPage.getByRole("button", { name: new RegExp(`^Board ${secondBoard}`) }),
      ).toBeVisible({ timeout: 15000 });
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await nsPage.context().close();
    }
  });

  test("reloading resolves to the first incomplete round, not round 1", async ({
    browser,
    request,
  }) => {
    test.setTimeout(120_000);

    const { directorPage, gameId } = await setUpStartedTwoTableGame(
      browser,
      `Play Reload Resolve ${Date.now()}`,
      { recordOpeningLead: false },
    );
    const nsPage = await newParticipant(browser);
    const ewPage = await newParticipant(browser);

    try {
      // Confirm EVERY board of round 1 at table 1 (both sides), so round 1 is
      // fully complete for the A1NS pair.
      const res = await request.get(`/api/games/${gameId}/schedule/A1NS`);
      expect(res.ok()).toBeTruthy();
      const schedule: Schedule = (await res.json()).result;
      const round1 = schedule.rounds.find((r) => r.roundNumber === 1);
      expect(round1).toBeTruthy();
      const round1Boards = round1!.boards;
      expect(round1Boards.length).toBeGreaterThan(0);

      // Confirm the first board via the paired helper (NS waits, EW confirms).
      await confirmBoardPassOut(nsPage, ewPage, gameId, 1, round1Boards[0]);

      // Confirm any remaining round-1 boards. After each confirm the NS page is
      // on Board Results; advancing ("Next") returns to enter the next board.
      for (let i = 1; i < round1Boards.length; i++) {
        await nsPage.getByTestId("board-results-next").click();
        await enterPassOut(nsPage, gameId, "A1NS", round1Boards[i]);
        await expect(nsPage.getByText("Waiting for confirmation")).toBeVisible({
          timeout: 15000,
        });
        await enterPassOut(ewPage, gameId, "A1EW", round1Boards[i]);
        await expect(nsPage.getByText("Board Results")).toBeVisible({
          timeout: 15000,
        });
      }

      // Reload the play page: a fresh mount re-derives the starting state and,
      // with round 1 fully confirmed, must resolve to round 2's round-info —
      // NOT back to round 1.
      await nsPage.goto(`/game/${gameId}/play/A1NS`);
      await expect(nsPage.getByText(/Round 2/)).toBeVisible({
        timeout: 15000,
      });
      await expect(nsPage.getByTestId("play-enter-round")).toBeVisible({
        timeout: 15000,
      });
      // And it is not showing round 1 any more.
      await expect(nsPage.getByText(/Round 1\b/)).toHaveCount(0);
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await nsPage.context().close();
      await ewPage.context().close();
    }
  });
});
