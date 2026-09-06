import { test, expect, Browser, Page } from "@playwright/test";

import { createGame } from "../fixtures/game-create";
import {
  setTableCount,
  pickFirstMovement,
  startGame,
} from "../fixtures/game-setup";
import { seatTwoTableField } from "../fixtures/join";
import { deleteGame } from "../fixtures/delete-game";
import { newParticipant } from "./support";

/**
 * Session-timer journey (director manage + display, two contexts).
 *
 * Replaces the older tests/timer.spec.ts, which drove a removed "Create/Start"
 * timer UI. The current flow is:
 *   - Pre-start: configure durations on the Timer setup tab and SAVE them
 *     (timer:saveConfig) — a "configured but not started" timer.
 *   - On game start: the saved timer is PROMOTED to a live (paused) timer
 *     (promoteTimerAtGameStart).
 *   - Post-start: /manage/timer shows the live controls (Start/Pause,
 *     Prev/Next phase, adjust ±, Apply Changes / updateConfig).
 *
 * The timer counts down in real time, so we use short durations and assert
 * observable display states (Round label, PAUSED, MM:SS, Move) with generous
 * timeouts rather than exact remaining values.
 */

/**
 * Set up a started two-table game whose timer was configured (and saved) BEFORE
 * the game started, so starting promotes it to a live paused timer. Returns the
 * director page and gameId.
 */
async function setUpStartedGameWithSavedTimer(
  browser: Browser,
  eventName: string,
  config: {
    totalRounds: number;
    playSeconds: number;
    moveSeconds: number;
  },
): Promise<{ directorPage: Page; gameId: string }> {
  const directorPage = await newParticipant(browser);
  const { gameId } = await createGame(directorPage, {
    eventName,
    recordOpeningLead: false,
  });

  await setTableCount(directorPage, 2);
  await pickFirstMovement(directorPage);

  // Configure the timer on the setup Timer tab and Save it (timer:saveConfig).
  await directorPage.goto(`/game/${gameId}/manage/timer`);
  // Wait for the config view (Save button) so the section has resolved before
  // we edit fields — otherwise the save can no-op on an unresolved section.
  const saveButton = directorPage.getByRole("button", { name: "Save", exact: true });
  await expect(saveButton).toBeVisible({ timeout: 15000 });
  await directorPage.locator("#total-rounds").fill(String(config.totalRounds));
  await directorPage.getByLabel("Play minutes").fill("0");
  await directorPage.getByLabel("Play seconds").fill(String(config.playSeconds));
  await directorPage.getByLabel("Move minutes").fill("0");
  await directorPage.getByLabel("Move seconds").fill(String(config.moveSeconds));
  await saveButton.click();
  // Give the save round-trip a moment to persist before starting.
  await directorPage.waitForTimeout(500);

  // Seat and start the game; starting promotes the saved timer to live.
  await seatTwoTableField(directorPage, gameId);
  await startGame(directorPage, gameId);

  return { directorPage, gameId };
}

test.describe("Session timer: save, promote-on-start, and live control", () => {
  test("a saved timer promotes on start and the director controls drive the display", async ({
    browser,
  }) => {
    test.setTimeout(90_000);

    const { directorPage, gameId } = await setUpStartedGameWithSavedTimer(
      browser,
      `Timer Journey ${Date.now()}`,
      { totalRounds: 3, playSeconds: 30, moveSeconds: 10 },
    );
    const displayPage = await newParticipant(browser);

    try {
      // The display, opened after start, shows the PROMOTED timer via
      // request-on-mount: round 1 of 3. (Promotion starts it running.)
      await displayPage.goto(`/game/${gameId}/display/timer`);
      await expect(displayPage.getByText("Round 1 of 3")).toBeVisible({
        timeout: 15000,
      });

      // Director live controls at /manage/timer (game is started).
      await directorPage.goto(`/game/${gameId}/manage/timer`);

      // Pause -> the display shows PAUSED. (Pause is available while running.)
      await directorPage.getByRole("button", { name: "Pause", exact: true }).click();
      await expect(displayPage.getByText("PAUSED")).toBeVisible({
        timeout: 15000,
      });

      // Start -> the display leaves PAUSED and counts down (MM:SS).
      await directorPage.getByRole("button", { name: "Start", exact: true }).click();
      await expect(displayPage.getByText("PAUSED")).toBeHidden({
        timeout: 15000,
      });
      await expect(displayPage.getByText(/^\d{2}:\d{2}$/)).toBeVisible({
        timeout: 15000,
      });

      // Next phase -> the move-for-round-2 phase shows on the display.
      await directorPage.getByRole("button", { name: "Next phase" }).click();
      await expect(displayPage.getByText("Move for Round 2")).toBeVisible({
        timeout: 15000,
      });

      // Previous phase -> steps back into a round's play.
      await directorPage.getByRole("button", { name: "Previous phase" }).click();
      await expect(displayPage.getByText(/Round \d of 3/)).toBeVisible({
        timeout: 15000,
      });
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await displayPage.context().close();
    }
  });

  test("adjusting the current phase and applying config changes update the live timer", async ({
    browser,
  }) => {
    test.setTimeout(90_000);

    const { directorPage, gameId } = await setUpStartedGameWithSavedTimer(
      browser,
      `Timer Adjust ${Date.now()}`,
      { totalRounds: 3, playSeconds: 40, moveSeconds: 10 },
    );
    const displayPage = await newParticipant(browser);

    try {
      await displayPage.goto(`/game/${gameId}/display/timer`);
      await expect(displayPage.getByText("Round 1 of 3")).toBeVisible({
        timeout: 15000,
      });

      await directorPage.goto(`/game/${gameId}/manage/timer`);

      // Pause first so the remaining value is frozen and exact assertions hold.
      // (Promotion starts the timer running.)
      await directorPage.getByRole("button", { name: "Pause", exact: true }).click();
      await expect(displayPage.getByText("PAUSED")).toBeVisible({
        timeout: 15000,
      });

      // Paused mid-play the remaining is at most the 40s full duration. Adjust
      // +1m and assert the remaining increases past the original 40s (i.e. it
      // now shows 01:MM), proving the adjustment reached the display.
      await directorPage.getByRole("button", { name: "+1m" }).click();
      await expect(displayPage.getByText(/^01:\d{2}$/)).toBeVisible({
        timeout: 15000,
      });

      // Change the play duration to 20s and Apply Changes (updateConfig). The
      // change applies to SUBSEQUENT play phases (the current phase keeps its
      // adjusted remaining). Step forward to round 2's play and assert it now
      // uses the new 20s duration (00:20).
      await directorPage.getByLabel("Play seconds").fill("20");
      await directorPage
        .getByRole("button", { name: "Apply Changes" })
        .click();

      // Next: play -> move (Move for Round 2); Next: move -> round 2 play.
      await directorPage.getByRole("button", { name: "Next phase" }).click();
      await expect(displayPage.getByText("Move for Round 2")).toBeVisible({
        timeout: 15000,
      });
      await directorPage.getByRole("button", { name: "Next phase" }).click();
      await expect(displayPage.getByText("Round 2 of 3")).toBeVisible({
        timeout: 15000,
      });
      await expect(displayPage.getByText("00:20")).toBeVisible({
        timeout: 15000,
      });
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await displayPage.context().close();
    }
  });
});
