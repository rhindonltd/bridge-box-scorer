import { test, expect } from "@playwright/test";

import { deleteGame } from "../fixtures/delete-game";
import { confirmBoardPassOut } from "../fixtures/play";
import { readSeatSecret, submitResultViaSocket } from "../fixtures/seat-secret";
import {
  closeSeatDevices,
  markSeatWithoutStanding,
  newParticipant,
  setUpStartedTwoTableGame,
} from "./support";

/**
 * Different-device handover journey (EBU §2.4.7, Path 2).
 *
 * A stand-in has been sitting a seat and the REAL pair arrives with THEIR OWN
 * device. The director marks the seat "without standing". The stand-in's device
 * mints a "Change device" code (self-serve — no director needed for the
 * handover itself); the real pair claims it on their device from the join
 * screen. Because the seat is a handover, the claim first INSPECTS the code,
 * then collects the arriving pair's names before claiming — the server runs the
 * handover engine, seats the real pair with a fresh secret, and signs the
 * stand-in's old device out of the seat.
 *
 * Unlike a plain "change device" transfer (see seat-transfer.journey.ts), this
 * reseats the occupant as a NEW real pair and defers their missed-board scoring
 * to the director's Late Arrivals screen. This asserts: the names step appears
 * only for a handover code; the claim rotates the secret; the stand-in's old
 * device is signed out; and the old/new tokens behave accordingly.
 */

interface Schedule {
  rounds: { roundNumber: number; boards: number[]; tableNumber: number }[];
}

test.describe("Handover (different device)", () => {
  test("a stand-in's code hands the seat to the real pair on a new device", async ({
    browser,
    request,
  }) => {
    test.setTimeout(120_000);

    const { directorPage, gameId, seats } = await setUpStartedTwoTableGame(
      browser,
      `Handover Different Device ${Date.now()}`,
      { recordOpeningLead: false },
    );
    const standInDevice = seats["A1NS"];
    const newDevice = await newParticipant(browser);

    try {
      // Play a board at table 1 so the seat has a played/unplayed split.
      await confirmBoardPassOut(standInDevice, seats["A1EW"], gameId, 1, 1);

      const oldSecret = readSeatSecret(gameId, "A1NS");
      expect(oldSecret, "seat A1NS should have a secret").toBeTruthy();

      // Director marks A1NS as a stand-in.
      await markSeatWithoutStanding(directorPage, gameId, "A1NS");

      // Stand-in device: mint a change-device code from the play header menu.
      await standInDevice.goto(`/game/${gameId}/play/A1NS`);
      await standInDevice.getByRole("button", { name: "Menu" }).click();
      await standInDevice
        .getByRole("menuitem", { name: "Change device" })
        .click();
      const codeEl = standInDevice.getByTestId("seat-transfer-code");
      await expect(codeEl).toBeVisible({ timeout: 15000 });
      const code = (await codeEl.textContent())?.trim() ?? "";
      expect(code).toHaveLength(6);

      // New device: open join and enter the code. Because the seat is a
      // handover, the flow advances to a names step rather than claiming at
      // once.
      await newDevice.goto(`/game/${gameId}/join`);
      await newDevice
        .getByRole("button", { name: /Moving from another device/i })
        .click();
      await newDevice.getByLabel("Transfer code").fill(code);
      await newDevice.getByRole("button", { name: "Take over seat" }).click();

      // The handover names step: the arriving pair enters their names.
      await expect(
        newDevice.getByText("Take over from the stand-in"),
      ).toBeVisible({ timeout: 15000 });
      await fillHandoverName(newDevice, "Player 1", "10077");
      await fillHandoverName(newDevice, "Player 2", "10079");
      await newDevice.getByRole("button", { name: "Take over seat" }).click();

      // Success routes the NEW device into the seat's play screen. The play
      // page keeps a live WebSocket open (its "load" never fires), so wait on
      // the route change at "commit".
      await newDevice.waitForURL(new RegExp(`/game/${gameId}/play/A1NS`), {
        timeout: 15000,
        waitUntil: "commit",
      });

      // The stand-in's OLD device is signed out of the seat (SEAT_TAKEN_OVER).
      await expect(
        standInDevice.getByText("This seat has moved to another device"),
      ).toBeVisible({ timeout: 15000 });

      // The stored secret rotated.
      const newSecret = readSeatSecret(gameId, "A1NS");
      expect(newSecret, "seat A1NS should still have a secret").toBeTruthy();
      expect(newSecret).not.toBe(oldSecret);

      // Behavioural proof on an UNPLAYED round-1 board: old token rejected, new
      // token accepted.
      const res = await request.get(`/api/games/${gameId}/play-state/A1NS`);
      expect(res.ok()).toBeTruthy();
      const schedule: Schedule = (await res.json()).result;
      const round1 = schedule.rounds.find((r) => r.roundNumber === 1)!;
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
      await newDevice.context().close();
      await closeSeatDevices(seats);
    }
  });
});

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
