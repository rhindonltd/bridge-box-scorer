import { test, expect } from "@playwright/test";

import { deleteGame } from "../fixtures/delete-game";
import { readSeatSecret, submitResultViaSocket } from "../fixtures/seat-secret";
import {
  closeSeatDevices,
  setUpStartedTwoTableGame,
  newParticipant,
  expectInlineError,
} from "./support";

/**
 * Seat transfer / "Change device" journey.
 *
 * A seated player hands their seat to another device: the old device mints a
 * single-use code from the play header ("Change device"), the new device claims
 * it from the join screen, and claiming ROTATES the seat's secret so only the
 * new device owns the seat.
 *
 * The rotation is the security-critical part, so this asserts it two ways:
 *  - the stored seat secret changes across the claim, and
 *  - a result submission with the OLD secret is rejected (Unauthorized) while
 *    the NEW secret is accepted — the same `game:submitResult` auth the app uses.
 */

interface Schedule {
  rounds: { roundNumber: number; boards: number[]; tableNumber: number }[];
}

test.describe("Seat transfer (Change device)", () => {
  test("claiming a code hands over the seat and rotates its secret", async ({
    browser,
    request,
  }) => {
    test.setTimeout(120_000);

    const { directorPage, gameId, seats } = await setUpStartedTwoTableGame(
      browser,
      `Seat Transfer ${Date.now()}`,
      { recordOpeningLead: false },
    );
    const oldDevice = seats["A1NS"];
    const newDevice = await newParticipant(browser);

    try {
      // The seat secret before any transfer.
      const oldSecret = readSeatSecret(gameId, "A1NS");
      expect(oldSecret, "seat A1NS should have a secret").toBeTruthy();

      // Old device: open the play header menu and choose "Change device", then
      // read the minted transfer code.
      await oldDevice.getByRole("button", { name: "Menu" }).click();
      await oldDevice.getByText("Change device").click();
      const codeEl = oldDevice.getByTestId("seat-transfer-code");
      await expect(codeEl).toBeVisible({ timeout: 15000 });
      const code = (await codeEl.textContent())?.trim() ?? "";
      expect(code).toHaveLength(6);

      // New device: open the join screen and claim the code.
      await newDevice.goto(`/game/${gameId}/join`);
      await newDevice
        .getByRole("button", { name: /Moving from another device/i })
        .click();
      await newDevice.getByLabel("Transfer code").fill(code);
      await newDevice.getByRole("button", { name: "Take over seat" }).click();

      // Success routes the new device straight into the seat's play screen.
      await newDevice.waitForURL(
        new RegExp(`/game/${gameId}/play/A1NS`),
        { timeout: 15000 },
      );

      // The stored secret rotated.
      const newSecret = readSeatSecret(gameId, "A1NS");
      expect(newSecret, "seat A1NS should still have a secret").toBeTruthy();
      expect(newSecret).not.toBe(oldSecret);

      // Behavioural proof: submit a round-1 board result for A1NS over a raw
      // socket. The OLD secret is now rejected; the NEW secret is accepted.
      const res = await request.get(`/api/games/${gameId}/schedule/A1NS`);
      expect(res.ok()).toBeTruthy();
      const schedule: Schedule = (await res.json()).result;
      const round1 = schedule.rounds.find((r) => r.roundNumber === 1)!;
      const board = round1.boards[0];

      const withOld = await submitResultViaSocket({
        gameId,
        seat: "A1NS",
        token: oldSecret!,
        roundNumber: 1,
        tableNumber: round1.tableNumber,
        boardNumber: board,
      });
      expect(withOld.success, "old token should be rejected").toBe(false);
      expect(withOld.error).toMatch(/unauthor/i);

      const withNew = await submitResultViaSocket({
        gameId,
        seat: "A1NS",
        token: newSecret!,
        roundNumber: 1,
        tableNumber: round1.tableNumber,
        boardNumber: board,
      });
      expect(withNew.success, "new token should be accepted").toBe(true);
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await newDevice.context().close();
      await closeSeatDevices(seats);
    }
  });

  test("an invalid transfer code is rejected", async ({ browser }) => {
    test.setTimeout(90_000);

    const { directorPage, gameId, seats } = await setUpStartedTwoTableGame(
      browser,
      `Seat Transfer Bad ${Date.now()}`,
      { recordOpeningLead: false },
    );
    const claimer = await newParticipant(browser);

    try {
      await claimer.goto(`/game/${gameId}/join`);
      await claimer
        .getByRole("button", { name: /Moving from another device/i })
        .click();
      await claimer.getByLabel("Transfer code").fill("ZZ9999");
      await claimer.getByRole("button", { name: "Take over seat" }).click();

      await expectInlineError(claimer, /invalid code/i);
      // No navigation into a seat.
      await expect(claimer).not.toHaveURL(/\/play\//);
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await claimer.context().close();
      await closeSeatDevices(seats);
    }
  });
});
