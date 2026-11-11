import { test, expect, Page } from "@playwright/test";

import { createGame } from "../fixtures/game-create";
import {
  setTableCount,
  pickSwissMovement,
  startGame,
} from "../fixtures/game-setup";
import { seatSingleSectionFieldOnDevices } from "../fixtures/join";
import { deleteGame } from "../fixtures/delete-game";
import { closeSeatDevices, newParticipant, gotoStable } from "./support";
import {
  confirmRound,
  drawNextRound,
  materializedRounds,
} from "../fixtures/swiss-round";

/**
 * Swiss Pairs end-to-end.
 *
 * Swiss is the one movement drawn round by round: only round 1 is set at the
 * start, and the director draws each later round from the standings once the
 * current round is fully scored. This journey creates a single-section Swiss
 * game, seats a full two-table field, plays and confirms round 1, then draws
 * round 2 from the in-play Movement screen — proving the whole live loop
 * (start → score → draw → next round appears) works through the UI.
 *
 * Round scoring is done over a direct socket from the test process (a matching
 * Pass Out from both seats of each table), the same technique the
 * complete-game fixture uses — far more robust than driving the wizard for
 * every seat, and orthogonal to what this journey is really testing (the draw).
 */

test.describe("Swiss Pairs draws round by round", () => {
  test("start, score round 1, then draw round 2 from the Movement screen", async ({
    browser,
  }) => {
    test.setTimeout(150_000);

    const tables = 2;
    const directorPage = await newParticipant(browser);
    const { gameId } = await createGame(directorPage, {
      eventName: `Swiss ${Date.now()}`,
      recordOpeningLead: false,
      gameType: "SWISS_PAIRS",
    });

    let seats: Record<string, Page> = {};
    try {
      await setTableCount(directorPage, tables);
      await pickSwissMovement(directorPage);

      seats = await seatSingleSectionFieldOnDevices(
        () => newParticipant(browser),
        gameId,
        tables,
      );
      await startGame(directorPage, gameId);

      // Only round 1 is materialized at start.
      expect(materializedRounds(gameId)).toBe(1);

      // Before scoring, the draw button is disabled (results not yet in).
      await gotoStable(directorPage, `/game/${gameId}/manage/movement`);
      await expect(directorPage.getByTestId("draw-next-round")).toBeDisabled({
        timeout: 15000,
      });

      // Score round 1, then draw round 2 — it should now be materialized.
      await confirmRound(gameId, 1, tables);
      await drawNextRound(directorPage, gameId);
      expect(materializedRounds(gameId)).toBe(2);

      // And the loop repeats: score round 2, draw round 3.
      await confirmRound(gameId, 2, tables);
      await drawNextRound(directorPage, gameId);
      expect(materializedRounds(gameId)).toBe(3);
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await closeSeatDevices(seats);
    }
  });

  test("the draw previews the seating and only commits on OK (Cancel discards)", async ({
    browser,
  }) => {
    test.setTimeout(150_000);

    const tables = 2;
    const directorPage = await newParticipant(browser);
    const { gameId } = await createGame(directorPage, {
      eventName: `Swiss Preview ${Date.now()}`,
      recordOpeningLead: false,
      gameType: "SWISS_PAIRS",
    });

    let seats: Record<string, Page> = {};
    try {
      await setTableCount(directorPage, tables);
      await pickSwissMovement(directorPage);
      seats = await seatSingleSectionFieldOnDevices(
        () => newParticipant(browser),
        gameId,
        tables,
      );
      await startGame(directorPage, gameId);
      await confirmRound(gameId, 1, tables);

      await gotoStable(directorPage, `/game/${gameId}/manage/movement`);

      // Click Draw: the preview page appears, but round 2 is NOT yet committed.
      await directorPage.getByTestId("draw-next-round").click();
      await expect(directorPage.getByTestId("draw-confirm")).toBeVisible({
        timeout: 15000,
      });
      expect(materializedRounds(gameId)).toBe(1);

      // Cancel discards the preview — still not committed.
      await directorPage.getByTestId("draw-cancel").click();
      await expect(directorPage.getByTestId("draw-next-round")).toBeVisible({
        timeout: 15000,
      });
      expect(materializedRounds(gameId)).toBe(1);

      // Draw again and this time accept: now round 2 is committed.
      await directorPage.getByTestId("draw-next-round").click();
      const ok = directorPage.getByTestId("draw-confirm");
      await expect(ok).toBeVisible({ timeout: 15000 });
      await ok.click();
      await expect(directorPage.getByTestId("draw-notice")).toBeVisible({
        timeout: 15000,
      });
      expect(materializedRounds(gameId)).toBe(2);
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await closeSeatDevices(seats);
    }
  });
});
