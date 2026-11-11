import { test, expect } from "@playwright/test";
import { confirmBoardPassOut } from "../fixtures/play";
import { readSeatSecret, submitResultViaSocket } from "../fixtures/seat-secret";
import { closeDevices, seedStartedTwoTableGame } from "../fixtures/seeded-game";
import { gotoStable, newParticipant } from "./support";

/**
 * Lost / dead device journey.
 *
 * A pair's phone dies mid-session. They cannot start "Change device" (it has to
 * be started on the device that holds the seat), so the DIRECTOR does it from
 * the Pairs screen: "Move to a new device" shows a code, the pair enters it on
 * their new device ("Move a seat to this device"), and the seat moves across
 * with a fresh secret. Unlike withdraw + reinstate, the pair stays Active and
 * no boards are marked as missed.
 *
 * Asserts: the code is minted by the director (who holds no token for the
 * seat); claiming rotates the secret (old token rejected, new one accepted);
 * the new device lands on the seat's play screen; and the pair is still Active.
 */
interface Schedule {
  rounds: { roundNumber: number; boards: number[]; tableNumber: number }[];
}

test.describe("Lost device (director moves the seat)", () => {
  for (const oldDevice of ["online", "offline"] as const) {
    // "online": the old phone is still connected when the seat moves.
    // "offline": it is off / out of signal at the time, and only finds out when
    // it comes back (the reconnect check).
    test(`the director moves a pair to a new device without withdrawing them (old phone ${oldDevice})`, async ({
      browser,
      request,
    }) => {
      test.setTimeout(120_000);
      const { directorPage, gameId, seats } = await seedStartedTwoTableGame(
        browser,
        `Lost Device ${Date.now()}`,
        { recordOpeningLead: false },
      );
      const newDevice = await newParticipant(browser);

      try {
        // Play a board so the seat has history that must survive the move.
        await confirmBoardPassOut(seats["A1NS"], seats["A1EW"], gameId, 1, 1);
        const oldSecret = readSeatSecret(gameId, "A1NS");
        expect(oldSecret, "seat A1NS should have a secret").toBeTruthy();

        if (oldDevice === "offline")
          await seats["A1NS"].context().setOffline(true);

        // Director: Pairs -> the pair's row -> Move to a new device -> code.
        await gotoStable(directorPage, `/game/${gameId}/manage/pairs`);
        await directorPage.getByRole("button", { name: /PA1NS North/ }).click();
        await directorPage
          .getByRole("button", { name: "Move to a new device" })
          .click();
        const codeEl = directorPage.getByTestId("seat-transfer-code");
        await expect(codeEl).toBeVisible({ timeout: 15000 });
        const code = (await codeEl.textContent())?.trim() ?? "";
        expect(code).toHaveLength(6);

        // The pair's new device claims it from the join screen. A plain device
        // move needs no names.
        await newDevice.goto(`/game/${gameId}/join`);
        await newDevice
          .getByRole("button", { name: /Moving from another device/i })
          .click();
        await newDevice.getByLabel("Transfer code").fill(code);
        await newDevice.getByRole("button", { name: "Take over seat" }).click();
        await newDevice.waitForURL(new RegExp(`/game/${gameId}/play/A1NS`), {
          timeout: 15000,
          waitUntil: "commit",
        });

        // The old phone is told its seat has moved (live, or on reconnecting).
        if (oldDevice === "offline")
          await seats["A1NS"].context().setOffline(false);
        await expect(
          seats["A1NS"].getByText("This seat has moved to another device"),
        ).toBeVisible({ timeout: 60000 });

        // The secret rotated.
        const newSecret = readSeatSecret(gameId, "A1NS");
        expect(newSecret).toBeTruthy();
        expect(newSecret).not.toBe(oldSecret);

        // The old device's token no longer works; the new one does.
        const res = await request.get(`/api/games/${gameId}/play-state/A1NS`);
        expect(res.ok()).toBeTruthy();
        const schedule: Schedule = (await res.json()).result;
        const round1 = schedule.rounds.find((r) => r.roundNumber === 1)!;
        const board = round1.boards.find((b) => b !== 1) ?? round1.boards[0];
        const args = {
          gameId,
          seat: "A1NS",
          roundNumber: 1,
          tableNumber: round1.tableNumber,
          boardNumber: board,
        };
        const withOld = await submitResultViaSocket({
          ...args,
          token: oldSecret!,
        });
        expect(withOld.success, "old device token should be rejected").toBe(
          false,
        );
        expect(withOld.error).toMatch(/unauthor/i);
        const withNew = await submitResultViaSocket({
          ...args,
          token: newSecret!,
        });
        expect(withNew.success, "new device token should be accepted").toBe(
          true,
        );

        // The pair was never withdrawn: still Active on the Pairs screen.
        await gotoStable(directorPage, `/game/${gameId}/manage/pairs`);
        const row = directorPage
          .getByRole("listitem")
          .filter({ hasText: "1NS" });
        await expect(row.getByText("Active")).toBeVisible({ timeout: 15000 });
        await expect(row.getByText(/Withdrew|Withdrawn/)).toHaveCount(0);
      } finally {
        await closeDevices(directorPage, newDevice, seats);
      }
    });
  }
});
