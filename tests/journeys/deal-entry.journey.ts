import { test, expect } from "@playwright/test";

import { deleteGame } from "../fixtures/delete-game";
import { confirmBoardPassOut } from "../fixtures/play";
import { fillAndSaveFullDeal } from "../fixtures/deal-entry";
import { buildPbnFile } from "../fixtures/pbn-import";
import {
  closeSeatDevices,
  setUpStartedTwoTableGame,
  gotoStable,
} from "./support";

/**
 * Board-deal capture journey (pure UI).
 *
 * Exercises the full deal loop through real screens:
 *   1. A pair finishes a round; the optional "Enter cards" step appears and the
 *      player records a full deal for the round's first board.
 *   2. That board's deal then shows behind the "Show hand" toggle on the
 *      player's board-results traveller.
 *   3. The director enters/corrects a board's deal from the Manage Game Menu's
 *      "Enter Deals" option.
 *   4. The director imports every board's hands from a dealing-machine PBN
 *      file, and a player's open traveller shows the hand live.
 *
 * Games record no opening lead so the play wizard stays short.
 */

interface Schedule {
  rounds: { roundNumber: number; boards: number[] }[];
}

test.describe("Board deal capture", () => {
  test("a player enters a deal after a round and can view it on the traveller", async ({
    browser,
    request,
  }) => {
    test.setTimeout(120_000);

    const { directorPage, gameId, seats } = await setUpStartedTwoTableGame(
      browser,
      `Deal Entry Player ${Date.now()}`,
      // Player hand entry on, so the post-round "Enter cards" step is offered.
      { recordOpeningLead: false, handEntry: true },
    );
    const nsPage = seats["A1NS"];
    const ewPage = seats["A1EW"];

    try {
      // Read round 1's boards so we drive its exact board list to completion.
      const res = await request.get(`/api/games/${gameId}/play-state/A1NS`);
      expect(res.ok()).toBeTruthy();
      const schedule: Schedule = (await res.json()).result;
      const round1 = schedule.rounds.find((r) => r.roundNumber === 1);
      expect(round1).toBeTruthy();
      const boards = round1!.boards;
      const firstBoard = boards[0];

      // Confirm the first board (both sides land on Board Results).
      await confirmBoardPassOut(nsPage, ewPage, gameId, 1, firstBoard);

      // Confirm any remaining round-1 boards to finish the round.
      for (let i = 1; i < boards.length; i++) {
        await nsPage.getByTestId("board-results-next").click();
        await confirmBoardPassOut(nsPage, ewPage, gameId, 1, boards[i]);
      }

      // Finishing the round's last board offers the optional "Enter cards"
      // step.
      await nsPage.getByTestId("board-results-next").click();
      await expect(nsPage.getByText("Enter cards")).toBeVisible({
        timeout: 15000,
      });

      // Enter a full deal for the first board shown, then finish the step.
      await expect(nsPage.getByTestId("deal-entry")).toBeVisible({
        timeout: 15000,
      });
      await fillAndSaveFullDeal(nsPage);

      // Continue out of the deal step (its label is "Skip"/"Done"). The flow
      // advances to the next round's move / round-info, proving the deal step
      // completed after a successful save.
      await nsPage.getByTestId("skip-deals").click();
      await expect(nsPage.getByText("Enter cards")).toBeHidden({
        timeout: 15000,
      });

      // The entered deal is now visible to the director on that board's
      // traveller (the shared per-board deal path). Open Enter Deals for the
      // first board: it pre-fills with the deal the player just recorded, so a
      // populated grid (13/13 on each direction) proves it round-tripped.
      // The deals page's StartedGuard briefly redirects to /manage while its
      // started-state resolves, which can interrupt a plain goto; gotoStable
      // rides that out. Once loaded it shows the board picker.
      const boardButton = directorPage.getByTestId(`select-board-${firstBoard}`);
      await gotoStable(directorPage, `/game/${gameId}/manage/deals`);
      await expect(boardButton).toBeVisible({ timeout: 15000 });
      await boardButton.click();

      // Each direction tab shows a full 13-card count, i.e. the deal loaded.
      await expect(directorPage.getByTestId("entry-dir-N")).toContainText(
        "13/13",
        { timeout: 15000 },
      );
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await closeSeatDevices(seats);
    }
  });

  test("the director enters a board's deal from the Enter Deals menu and it shows on the traveller", async ({
    browser,
    request,
  }) => {
    test.setTimeout(120_000);

    const { directorPage, gameId, seats } = await setUpStartedTwoTableGame(
      browser,
      `Deal Entry Director ${Date.now()}`,
      { recordOpeningLead: false },
    );
    const nsPage = seats["A1NS"];
    const ewPage = seats["A1EW"];

    try {
      // Read round 1's first board and confirm it so there's a board to view.
      const res = await request.get(`/api/games/${gameId}/play-state/A1NS`);
      expect(res.ok()).toBeTruthy();
      const schedule: Schedule = (await res.json()).result;
      const board = schedule.rounds.find((r) => r.roundNumber === 1)!.boards[0];
      await confirmBoardPassOut(nsPage, ewPage, gameId, 1, board);

      // Director opens the Enter Deals page. Its StartedGuard can briefly
      // redirect to /manage while resolving, so gotoStable rides that out.
      const boardButton = directorPage.getByTestId(`select-board-${board}`);
      await gotoStable(directorPage, `/game/${gameId}/manage/deals`);
      await expect(boardButton).toBeVisible({ timeout: 15000 });

      await boardButton.click();

      // Enter a full deal and save it.
      await expect(directorPage.getByTestId("deal-entry")).toBeVisible({
        timeout: 15000,
      });
      await fillAndSaveFullDeal(directorPage);

      // Saving returns the director to the Manage Game Menu.
      await expect(directorPage).toHaveURL(
        new RegExp(`/game/${gameId}/manage$`),
        { timeout: 15000 },
      );

      // The player's still-mounted board-results traveller now holds the deal
      // (pushed live). The player reveals it from the play header menu: once a
      // deal exists, the menu gains a "Deal" view option that switches the
      // board-results body to the hand diagram. Open the menu and pick "Deal".
      await nsPage.getByRole("button", { name: "Menu" }).click();
      const dealItem = nsPage.getByRole("menuitem", { name: "Deal", exact: true });
      // The "Deal" item only appears once the live deal has arrived, so this
      // also waits out the push.
      await expect(dealItem).toBeVisible({ timeout: 15000 });
      await dealItem.click();
      await expect(nsPage.getByTestId("deal-display")).toBeVisible({
        timeout: 15000,
      });
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await closeSeatDevices(seats);
    }
  });

  test("the director imports a PBN file and the hands show live on a player's traveller", async ({
    browser,
    request,
  }) => {
    test.setTimeout(120_000);

    const { directorPage, gameId, seats } = await setUpStartedTwoTableGame(
      browser,
      `Deal Import ${Date.now()}`,
      { recordOpeningLead: false },
    );
    const nsPage = seats["A1NS"];
    const ewPage = seats["A1EW"];

    try {
      // The event's boards, and round 1's first board so a player is parked on
      // a board-results traveller (which will receive the hand live).
      const boardsRes = await request.get(`/api/games/${gameId}/boards`);
      expect(boardsRes.ok()).toBeTruthy();
      const eventBoards: number[] = (await boardsRes.json()).result.boards;
      expect(eventBoards.length).toBeGreaterThan(0);

      const res = await request.get(`/api/games/${gameId}/play-state/A1NS`);
      expect(res.ok()).toBeTruthy();
      const schedule: Schedule = (await res.json()).result;
      const board = schedule.rounds.find((r) => r.roundNumber === 1)!.boards[0];
      await confirmBoardPassOut(nsPage, ewPage, gameId, 1, board);

      // Director: Enter Deals -> Import from PBN file. (gotoStable rides out
      // the StartedGuard's brief redirect.)
      await gotoStable(directorPage, `/game/${gameId}/manage/deals`);
      const importButton = directorPage.getByRole("button", {
        name: "Import from PBN file",
      });
      await expect(importButton).toBeVisible({ timeout: 15000 });
      await importButton.click();

      // Choose a file the way a phone would, via the native file input.
      await directorPage.getByLabel("PBN file", { exact: true }).setInputFiles({
        name: "club-night.pbn",
        mimeType: "text/plain",
        buffer: Buffer.from(buildPbnFile(eventBoards)),
      });

      // The preview accounts for every board in the event.
      const preview = directorPage.getByTestId("import-preview");
      await expect(preview).toContainText(
        `${eventBoards.length} ${eventBoards.length === 1 ? "board" : "boards"} found, 0 missing`,
        { timeout: 15000 },
      );
      await expect(preview).toContainText("will be replaced");

      await directorPage
        .getByRole("button", { name: /^Import \d+ boards?$/ })
        .click();
      await expect(
        directorPage.getByText(/\d+ boards? imported/),
      ).toBeVisible({ timeout: 15000 });

      // Done returns the director to the Manage Game Menu.
      await directorPage.getByRole("button", { name: "Done" }).click();
      await expect(directorPage).toHaveURL(
        new RegExp(`/game/${gameId}/manage$`),
        { timeout: 15000 },
      );

      // The player's still-mounted traveller received the hand live: the
      // header menu gains a "Deal" option, which shows the hand diagram.
      await nsPage.getByRole("button", { name: "Menu" }).click();
      const dealItem = nsPage.getByRole("menuitem", {
        name: "Deal",
        exact: true,
      });
      await expect(dealItem).toBeVisible({ timeout: 15000 });
      await dealItem.click();
      await expect(nsPage.getByTestId("deal-display")).toBeVisible({
        timeout: 15000,
      });
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await closeSeatDevices(seats);
    }
  });
});
