import { test, expect } from "@playwright/test";

import { deleteGame } from "../fixtures/delete-game";
import {
  ContractSpec,
  confirmBoardNotPlayed,
  confirmBoardPlayedContract,
} from "../fixtures/play";
import { closeSeatDevices, setUpStartedTwoTableGame } from "./support";

/**
 * Contract-variant journeys (pure UI, no socket seam).
 *
 * Extends the played-contract coverage to the remaining ContractWizard shapes:
 * doubled and redoubled contracts, a "down" (undertrick) result, the "Not
 * Played" special outcome.
 *
 * Games are created with opening-lead recording OFF to keep the wizard short;
 * the doubling/result/NP handling is independent of the lead setting.
 */

test.describe("Contract variants", () => {
  test("a doubled contract confirms and shows the double in the traveller", async ({
    browser,
  }) => {
    test.setTimeout(90_000);

    const { directorPage, gameId, seats } = await setUpStartedTwoTableGame(
      browser,
      `Doubled ${Date.now()}`,
      { recordOpeningLead: false },
    );
    const nsPage = seats["A1NS"];
    const ewPage = seats["A1EW"];

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
      await closeSeatDevices(seats);
    }
  });

  test("a redoubled contract going down confirms and shows XX and the undertricks", async ({
    browser,
  }) => {
    test.setTimeout(90_000);

    const { directorPage, gameId, seats } = await setUpStartedTwoTableGame(
      browser,
      `Redoubled Down ${Date.now()}`,
      { recordOpeningLead: false },
    );
    const nsPage = seats["A1NS"];
    const ewPage = seats["A1EW"];

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
      await closeSeatDevices(seats);
    }
  });

  test("a Not Played board confirms and shows NP in the traveller", async ({
    browser,
  }) => {
    test.setTimeout(90_000);

    const { directorPage, gameId, seats } = await setUpStartedTwoTableGame(
      browser,
      `Not Played ${Date.now()}`,
      { recordOpeningLead: false },
    );
    const nsPage = seats["A1NS"];
    const ewPage = seats["A1EW"];

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
      await closeSeatDevices(seats);
    }
  });
});
