import { test, expect } from "@playwright/test";

import { deleteGame } from "../fixtures/delete-game";
import { confirmBoardPassOut } from "../fixtures/play";
import { readSeatSecret, submitResultViaSocket } from "../fixtures/seat-secret";
import {
  closeSeatDevices,
  markSeatWithoutStanding,
  setUpStartedTwoTableGame,
} from "./support";

/**
 * Same-device handover journey (EBU §2.4.7, Path 1).
 *
 * A stand-in has been sitting a seat and the REAL pair arrives at the SAME
 * device. The director first marks the seat "without standing" (making it a
 * stand-in). The player device then gains a "Handover" item in its play-header
 * menu; the arriving pair enters their names and taps "Take over this device",
 * which reseats THIS device as the real pair and carries on from the next
 * board.
 *
 * The security-critical part is the secret rotation: the handover mints a fresh
 * seat secret (so the stand-in's old credential is invalidated) and stores it
 * on this same device. This asserts it both structurally (the stored seat
 * secret changes) and behaviourally (a submission with the OLD secret is now
 * rejected, while the NEW secret — the one this device kept — is accepted).
 */

interface Schedule {
  rounds: { roundNumber: number; boards: number[]; tableNumber: number }[];
}

test.describe("Handover (same device)", () => {
  test("a stand-in seat hands over to the arriving pair on the same device", async ({
    browser,
    request,
  }) => {
    test.setTimeout(120_000);

    const { directorPage, gameId, seats } = await setUpStartedTwoTableGame(
      browser,
      `Handover Same Device ${Date.now()}`,
      { recordOpeningLead: false },
    );
    const standInDevice = seats["A1NS"];

    try {
      // Play a board at table 1 so the seat has a played/unplayed split: the
      // stand-in keeps board 1, the real pair takes over from the next board.
      await confirmBoardPassOut(standInDevice, seats["A1EW"], gameId, 1, 1);

      // The seat's secret before the handover (the stand-in's credential).
      const oldSecret = readSeatSecret(gameId, "A1NS");
      expect(oldSecret, "seat A1NS should have a secret").toBeTruthy();

      // Director marks A1NS as a stand-in ("Without standing").
      await markSeatWithoutStanding(directorPage, gameId, "A1NS");

      // Back on the stand-in's device: reload the seat so the fresh
      // PARTICIPANTS (now WITHOUT_STANDING) drives the "Handover" menu item.
      await standInDevice.goto(`/game/${gameId}/play/A1NS`);
      await standInDevice.getByRole("button", { name: "Menu" }).click();
      await standInDevice.getByRole("menuitem", { name: "Handover" }).click();

      // The handover name-entry screen (reuses the join PlayerSearch).
      await standInDevice.waitForURL(
        new RegExp(`/game/${gameId}/play/A1NS/handover`),
        { timeout: 15000 },
      );

      // Enter the arriving real pair by EBU number (two players not already in
      // this game). PlayerSearch exposes each field as
      // `player-search-input-{label}` and each result as `player-search-result`.
      await fillHandoverName(standInDevice, "Player 1", "10077");
      await fillHandoverName(standInDevice, "Player 2", "10079");

      await standInDevice
        .getByRole("button", { name: "Take over this device" })
        .click();

      // Success returns this device from the handover screen (.../play/A1NS/
      // handover) to its play screen (.../play/A1NS) as the real pair, via a
      // client-side `router.replace`. The play page holds a live WebSocket open
      // so its "load" never fires; poll the pathname directly for the route
      // change rather than waiting on a load state.
      await standInDevice.waitForFunction(
        () => /\/play\/A1NS$/.test(window.location.pathname),
        undefined,
        { timeout: 15000 },
      );

      // The stored secret rotated: the stand-in's old credential is gone.
      const newSecret = readSeatSecret(gameId, "A1NS");
      expect(newSecret, "seat A1NS should still have a secret").toBeTruthy();
      expect(newSecret).not.toBe(oldSecret);

      // Behavioural proof over a raw socket, on an UNPLAYED board of round 1.
      // The OLD secret is now rejected; the NEW secret (kept on this device) is
      // accepted.
      const res = await request.get(`/api/games/${gameId}/play-state/A1NS`);
      expect(res.ok()).toBeTruthy();
      const schedule: Schedule = (await res.json()).result;
      const round1 = schedule.rounds.find((r) => r.roundNumber === 1)!;
      // Board 1 is already played; use the next board in the round.
      const board = round1.boards.find((b) => b !== 1) ?? round1.boards[0];

      const withOld = await submitResultViaSocket({
        gameId,
        seat: "A1NS",
        token: oldSecret!,
        roundNumber: 1,
        tableNumber: round1.tableNumber,
        boardNumber: board,
      });
      expect(withOld.success, "old stand-in token should be rejected").toBe(
        false,
      );
      expect(withOld.error).toMatch(/unauthor/i);

      const withNew = await submitResultViaSocket({
        gameId,
        seat: "A1NS",
        token: newSecret!,
        roundNumber: 1,
        tableNumber: round1.tableNumber,
        boardNumber: board,
      });
      expect(withNew.success, "new real-pair token should be accepted").toBe(
        true,
      );
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await closeSeatDevices(seats);
    }
  });
});

/**
 * Fill one of the two handover name fields by EBU number, mirroring the join
 * flow's seat fill. PlayerSearch (reused on the handover screen) debounces the
 * query (~250ms) and matches the full EBU number, so wait for the result button
 * to appear before clicking it rather than racing the debounce.
 */
async function fillHandoverName(
  page: import("@playwright/test").Page,
  label: "Player 1" | "Player 2",
  ebuNumber: string,
): Promise<void> {
  const input = page.getByTestId(`player-search-input-${label}`);
  await input.fill(ebuNumber);
  const result = page.getByTestId("player-search-result").first();
  await expect(result).toBeVisible({ timeout: 10000 });
  await result.click();
}
