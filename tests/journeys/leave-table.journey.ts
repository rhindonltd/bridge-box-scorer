import { test, expect } from "@playwright/test";

import { createGame } from "../fixtures/game-create";
import { setTableCount, pickFirstMovement } from "../fixtures/game-setup";
import { seatPairBySeat, SEEDED_EBU } from "../fixtures/join";
import { deleteGame } from "../fixtures/delete-game";
import { newParticipant } from "./support";

/**
 * Player "leave table" journey (pre-start un-seat).
 *
 * Before a game starts, a seated player can leave their seat from the
 * "waiting to start" screen; the seat frees and the change propagates live to
 * any other device viewing the seat grid (a PARTICIPANTS broadcast). This is
 * the player-initiated counterpart to director eviction (an HTTP DELETE, tested
 * in table-management.journey.ts).
 */

test.describe("Player leave table (pre-start)", () => {
  test("leaving a seat frees it live for another device", async ({
    browser,
  }) => {
    test.setTimeout(90_000);

    const director = await newParticipant(browser);
    const { gameId } = await createGame(director, {
      eventName: `Leave Table ${Date.now()}`,
      recordOpeningLead: false,
    });

    let watcher: Awaited<ReturnType<typeof newParticipant>> | null = null;
    let player: Awaited<ReturnType<typeof newParticipant>> | null = null;

    try {
      await setTableCount(director, 2);
      await pickFirstMovement(director);

      // A watcher device opens the join grid; A1NS starts free.
      watcher = await newParticipant(browser);
      await watcher.goto(`/game/${gameId}/join`);
      const watchedSeat = watcher.getByTestId("seat-A1NS");
      await expect(watchedSeat).toBeEnabled({ timeout: 15000 });

      // A player seats at A1NS from their own device and lands on the
      // "waiting to start" screen (the game has not started).
      player = await newParticipant(browser);
      await seatPairBySeat(
        player,
        gameId,
        "A1NS",
        SEEDED_EBU.jacquelineCollier,
        SEEDED_EBU.davidCollier,
      );

      // The watcher sees the seat go occupied live.
      await expect(watchedSeat).toBeDisabled({ timeout: 15000 });

      // The player leaves the table. Leaving is confirmed via a native dialog,
      // so accept it when it fires.
      player.on("dialog", (dialog) => dialog.accept());
      await player.getByRole("button", { name: "Leave table" }).click();

      // The player is routed back to the join screen once the seat is freed.
      await player.waitForURL(new RegExp(`/game/${gameId}/join`), {
        timeout: 15000,
      });

      // And the watcher sees A1NS become available again live (no reload).
      await expect(watchedSeat).toBeEnabled({ timeout: 15000 });
    } finally {
      if (watcher) await watcher.context().close();
      if (player) await player.context().close();
      await deleteGame(director, gameId);
      await director.context().close();
    }
  });
});
