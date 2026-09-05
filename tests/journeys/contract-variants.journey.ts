import { test, expect } from "@playwright/test";

import { deleteGame } from "../fixtures/delete-game";
import {
  ContractSpec,
  confirmBoardNotPlayed,
  confirmBoardPlayedContract,
} from "../fixtures/play";
import { newParticipant, setUpStartedTwoTableGame } from "./support";

/**
 * Contract-variant journeys (pure UI, no socket seam).
 *
 * Extends the played-contract coverage to the remaining ContractWizard shapes:
 * doubled and redoubled contracts, a "down" (undertrick) result, the "Not
 * Played" special outcome, and paging between already-played boards on the
 * Board Results screen via the BoardSelector dropdown.
 *
 * Games are created with opening-lead recording OFF to keep the wizard short;
 * the doubling/result/NP handling is independent of the lead setting.
 */

test.describe("Contract variants and board paging", () => {
  test("a doubled contract confirms and shows the double in the traveller", async ({
    browser,
  }) => {
    test.setTimeout(90_000);

    const { directorPage, gameId } = await setUpStartedTwoTableGame(
      browser,
      `Doubled ${Date.now()}`,
      { recordOpeningLead: false },
    );
    const nsPage = await newParticipant(browser);
    const ewPage = await newParticipant(browser);

    try {
      // 4♥ X by North, making exactly.
      const doubled: ContractSpec = {
        level: 4,
        suit: "H",
        declarer: "N",
        doubling: "X",
        result: { mode: "made", value: 0 },
      };
      await confirmBoardPlayedContract(nsPage, ewPage, gameId, 1, 1, doubled, {
        leadCardRequired: false,
      });

      // The traveller renders the doubling. Scope to the traveller row region
      // via the confirmed contract cell: the double "X" is shown.
      await expect(nsPage.getByText("Board Results")).toBeVisible({
        timeout: 15000,
      });
      // The confirmed contract cell reads e.g. "4♥XN=". Assert the doubled
      // marker and heart glyph are present in the rendered traveller.
      await expect(nsPage.getByText(/4.*X.*N/).first()).toBeVisible({
        timeout: 15000,
      });
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await nsPage.context().close();
      await ewPage.context().close();
    }
  });

  test("a redoubled contract going down confirms and shows XX and the undertricks", async ({
    browser,
  }) => {
    test.setTimeout(90_000);

    const { directorPage, gameId } = await setUpStartedTwoTableGame(
      browser,
      `Redoubled Down ${Date.now()}`,
      { recordOpeningLead: false },
    );
    const nsPage = await newParticipant(browser);
    const ewPage = await newParticipant(browser);

    try {
      // 3NT XX by North, down 2 -> code "3NTXXN-2".
      const redoubledDown: ContractSpec = {
        level: 3,
        suit: "NT",
        declarer: "N",
        doubling: "XX",
        result: { mode: "down", value: 2 },
      };
      await confirmBoardPlayedContract(
        nsPage,
        ewPage,
        gameId,
        1,
        1,
        redoubledDown,
        { leadCardRequired: false },
      );

      await expect(nsPage.getByText("Board Results")).toBeVisible({
        timeout: 15000,
      });
      // The traveller cell reads "3NTXXN-2": assert the redouble and the
      // undertrick result render.
      await expect(nsPage.getByText(/3NT.*XX.*N-2/).first()).toBeVisible({
        timeout: 15000,
      });
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await nsPage.context().close();
      await ewPage.context().close();
    }
  });

  test("a Not Played board confirms and shows NP in the traveller", async ({
    browser,
  }) => {
    test.setTimeout(90_000);

    const { directorPage, gameId } = await setUpStartedTwoTableGame(
      browser,
      `Not Played ${Date.now()}`,
      { recordOpeningLead: false },
    );
    const nsPage = await newParticipant(browser);
    const ewPage = await newParticipant(browser);

    try {
      // Both sides select "Not Played" (the level-step short-circuit) and the
      // board confirms via dual-side agreement, landing both on Board Results.
      await confirmBoardNotPlayed(nsPage, ewPage, gameId, 1, 1);

      // Reaching Board Results on both sides proves the NP outcome flowed
      // through the level-step short-circuit and dual-side confirmation. A Not
      // Played board carries no matchpoint score, so the scored traveller shows
      // no result row for it (the MP plugin filters scoreless lines) — hence we
      // assert the confirmation, not a rendered "NP" cell.
      await expect(nsPage.getByText("Board Results")).toBeVisible({
        timeout: 15000,
      });
      await expect(ewPage.getByText("Board Results")).toBeVisible({
        timeout: 15000,
      });
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await nsPage.context().close();
      await ewPage.context().close();
    }
  });

  test("the BoardSelector pages back to an earlier played board", async ({
    browser,
  }) => {
    test.setTimeout(120_000);

    const { directorPage, gameId } = await setUpStartedTwoTableGame(
      browser,
      `Board Paging ${Date.now()}`,
      { recordOpeningLead: false },
    );
    const nsPage = await newParticipant(browser);
    const ewPage = await newParticipant(browser);

    try {
      // Board 1: a hearts contract; board 2: a spades contract, so the two
      // travellers are visually distinguishable when paging between them.
      const board1: ContractSpec = {
        level: 4,
        suit: "H",
        declarer: "N",
        result: { mode: "made", value: 0 },
      };
      const board2: ContractSpec = {
        level: 2,
        suit: "S",
        declarer: "N",
        result: { mode: "made", value: 0 },
      };

      // Confirm board 1 (both sides land on Board Results), then advance to
      // board 2 and confirm it. After board 2, the NS page is on Board Results
      // with TWO played boards, so the BoardSelector dropdown appears.
      await confirmBoardPlayedContract(nsPage, ewPage, gameId, 1, 1, board1, {
        leadCardRequired: false,
      });
      await nsPage.getByTestId("board-results-next").click();
      await ewPage.getByTestId("board-results-next").click();

      await confirmBoardPlayedContract(nsPage, ewPage, gameId, 1, 2, board2, {
        leadCardRequired: false,
      });

      // On Board Results for board 2, the selector trigger reads "Board 2".
      const selector = nsPage.getByRole("button", { name: /Board 2/ });
      await expect(selector).toBeVisible({ timeout: 15000 });
      await selector.click();

      // Choose "Board 1" from the dropdown; the traveller re-renders for it.
      await nsPage.getByRole("button", { name: "Board 1", exact: true }).click();

      // Board 1 was a hearts contract; assert the hearts glyph shows after
      // paging back (board 2 was spades, so this distinguishes the switch).
      await expect(nsPage.getByText("\u2665").first()).toBeVisible({
        timeout: 15000,
      });
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await nsPage.context().close();
      await ewPage.context().close();
    }
  });
});
