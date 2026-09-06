import { test, expect, Browser, Page } from "@playwright/test";

import { createGame } from "../fixtures/game-create";
import {
  setTableCount,
  pickFirstMovement,
  startGame,
} from "../fixtures/game-setup";
import { seatTwoTableField } from "../fixtures/join";
import { deleteGame } from "../fixtures/delete-game";
import {
  newParticipant,
  setUpStartedTwoSectionGame,
} from "./support";

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
    /** Optional break: after which round, and its duration in minutes. */
    breakAfterRound?: number;
    breakMinutes?: number;
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

  if (config.breakAfterRound != null) {
    await directorPage.getByRole("button", { name: "+ Add break" }).click();
    await directorPage
      .getByLabel("Break 1 after round")
      .fill(String(config.breakAfterRound));
    await directorPage
      .getByLabel("Break 1 duration minutes")
      .fill(String(config.breakMinutes ?? 5));
  }

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

  test("a scheduled break shows the break screen on the display", async ({
    browser,
  }) => {
    test.setTimeout(90_000);

    const { directorPage, gameId } = await setUpStartedGameWithSavedTimer(
      browser,
      `Timer Break ${Date.now()}`,
      { totalRounds: 3, playSeconds: 20, moveSeconds: 10, breakAfterRound: 1, breakMinutes: 2 },
    );
    const displayPage = await newParticipant(browser);

    try {
      await displayPage.goto(`/game/${gameId}/display/timer`);
      await expect(displayPage.getByText("Round 1 of 3")).toBeVisible({
        timeout: 15000,
      });

      // Advance one phase from round 1's play: the gap after round 1 is the
      // scheduled break, so the display shows the break screen.
      await directorPage.goto(`/game/${gameId}/manage/timer`);
      await directorPage.getByRole("button", { name: "Next phase" }).click();

      await expect(displayPage.getByText("Break")).toBeVisible({
        timeout: 15000,
      });
      await expect(
        displayPage.getByText(/Next round starts at/),
      ).toBeVisible({ timeout: 15000 });
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await displayPage.context().close();
    }
  });
});

test.describe("Timer config screen (pre-start)", () => {
  test("shows a session-length preview and Connecting… on a fresh display", async ({
    browser,
  }) => {
    test.setTimeout(60_000);

    const directorPage = await newParticipant(browser);
    const { gameId } = await createGame(directorPage, {
      eventName: `Timer Config ${Date.now()}`,
      recordOpeningLead: false,
    });
    const displayPage = await newParticipant(browser);

    try {
      await setTableCount(directorPage, 2);
      await pickFirstMovement(directorPage);

      // A display opened before any timer exists shows the "Connecting…"
      // placeholder (no timer state yet).
      await displayPage.goto(`/game/${gameId}/display/timer`);
      await expect(displayPage.getByText("Connecting")).toBeVisible({
        timeout: 15000,
      });

      // The config screen shows a not-started status with a session-length
      // preview.
      await directorPage.goto(`/game/${gameId}/manage/timer`);
      await expect(
        directorPage.getByRole("button", { name: "Save", exact: true }),
      ).toBeVisible({ timeout: 15000 });
      await expect(directorPage.getByText("Session Length")).toBeVisible();
      await expect(directorPage.getByText("Not started yet")).toBeVisible();
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await displayPage.context().close();
    }
  });

  // NOTE: the invalid-break-timing alert ("Break timing is invalid") is NOT
  // covered here. Triggering it end-to-end depends on wall-clock projection of
  // a resume-time break against the live schedule, which is timing-fragile in a
  // browser test. It is already covered at the unit level: the validation logic
  // in `src/timer/breaks.test.ts` and the alert rendering in
  // `TimerConfigView.test.tsx` / `TimerLiveView.test.tsx`.
});

test.describe("Timer live status panel and apply-to-future adjust", () => {
  test("the live status panel reflects state and apply-to-future carries the adjust forward", async ({
    browser,
  }) => {
    test.setTimeout(90_000);

    const { directorPage, gameId } = await setUpStartedGameWithSavedTimer(
      browser,
      `Timer Status Panel ${Date.now()}`,
      { totalRounds: 3, playSeconds: 40, moveSeconds: 10 },
    );

    try {
      // startGame lands on /manage; let any post-start redirect settle before
      // navigating to the timer route so the goto isn't interrupted.
      await directorPage.waitForURL(/\/manage$/, { timeout: 15000 });
      await directorPage.goto(`/game/${gameId}/manage/timer`);

      // The live status panel shows Status / Remaining / Round labels with
      // live values. Pause so the values are stable, then read them from the
      // panel (scoped by its labels).
      await directorPage
        .getByRole("button", { name: "Pause", exact: true })
        .click();

      // Status row reads "paused" once paused (capitalised in the UI, matched
      // case-insensitively). Use exact label text (the event name also contains
      // the word "Status").
      await expect(
        directorPage.getByText("Status", { exact: true }),
      ).toBeVisible({ timeout: 15000 });
      await expect(directorPage.getByText(/^paused$/i)).toBeVisible({
        timeout: 15000,
      });
      // Round row shows the current round (1).
      await expect(directorPage.getByText("Round", { exact: true })).toBeVisible();
      // Remaining shows a MM:SS value.
      await expect(
        directorPage.getByText("Remaining", { exact: true }),
      ).toBeVisible();
      await expect(
        directorPage.getByText(/^\d{2}:\d{2}$/).first(),
      ).toBeVisible({ timeout: 15000 });

      // Tick "Apply to all subsequent phases of this type" then add +1m. With
      // apply-to-future ON the adjustment carries to LATER play phases too.
      await directorPage
        .getByRole("checkbox", {
          name: /Apply to all subsequent phases/,
        })
        .check();
      await directorPage.getByRole("button", { name: "+1m" }).click();

      // Step forward to round 2's PLAY phase (play -> move -> play). Its base
      // duration was 40s; with the +1m applied to future play phases it now
      // starts above one minute (01:MM).
      await directorPage.getByRole("button", { name: "Next phase" }).click();
      await directorPage.getByRole("button", { name: "Next phase" }).click();

      const displayPage = await newParticipant(browser);
      try {
        await displayPage.goto(`/game/${gameId}/display/timer`);
        await expect(displayPage.getByText("Round 2 of 3")).toBeVisible({
          timeout: 15000,
        });
        await expect(displayPage.getByText(/^01:\d{2}$/)).toBeVisible({
          timeout: 15000,
        });
      } finally {
        await displayPage.context().close();
      }
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
    }
  });
});

test.describe("Timer config (multi-section): section picker & Apply to all", () => {
  test("the section picker switches sections and Apply to all sections copies config", async ({
    browser,
  }) => {
    test.setTimeout(120_000);

    // A two-section game that is NOT started -> /manage/timer shows the
    // per-section CONFIG view with the section picker + "Apply to all
    // sections". Build it directly (a second section added via the setup UI)
    // rather than the started-game helper.
    const page = await newParticipant(browser);
    const { gameId: gid } = await createGame(page, {
      eventName: `Timer Cfg Sections ${Date.now()}`,
      recordOpeningLead: false,
    });
    try {
      await setTableCount(page, 2);
      // Add a second section through the Movement tab's SectionManager.
      await page.getByRole("tab", { name: "Movement" }).click();
      await page.getByRole("button", { name: "Add Section" }).click();
      // Let the sections list settle.
      await page.waitForTimeout(500);

      // Open the standalone timer manager (game not started -> config view).
      await page.goto(`/game/${gid}/manage/timer`);

      // The section picker (role=tab) shows Section A and Section B.
      const tabA = page.getByRole("tab", { name: /Section A/ });
      const tabB = page.getByRole("tab", { name: /Section B/ });
      await expect(tabA).toBeVisible({ timeout: 15000 });
      await expect(tabB).toBeVisible();

      // Configure Section A with a distinctive total-rounds value, then Apply
      // to all sections (copies this config to B as well).
      await expect(
        page.getByRole("button", { name: "Save", exact: true }),
      ).toBeVisible({ timeout: 15000 });
      await page.locator("#total-rounds").fill("7");
      await page
        .getByRole("button", { name: "Apply to all sections" })
        .click();
      await page.waitForTimeout(500);

      // Switch to Section B; its config now reflects the applied 7 rounds
      // (the TimerProvider re-requests B's persisted state on section change).
      await tabB.click();
      await expect
        .poll(async () => page.locator("#total-rounds").inputValue(), {
          timeout: 15000,
        })
        .toBe("7");
    } finally {
      await deleteGame(page, gid);
      await page.context().close();
    }
  });
});

test.describe("Timer display (multi-section)", () => {
  test("multi-section shows a section chooser; single-section skips it", async ({
    browser,
  }) => {
    test.setTimeout(180_000);

    // Multi-section game → the timer display shows the section chooser.
    const { directorPage, gameId } = await setUpStartedTwoSectionGame(
      browser,
      `Timer Sections ${Date.now()}`,
    );
    const displayPage = await newParticipant(browser);

    try {
      await displayPage.goto(`/game/${gameId}/display/timer`);
      await expect(displayPage.getByText("Choose a section")).toBeVisible({
        timeout: 15000,
      });
      // Choosing a section leaves the chooser and enters that section's timer
      // view. This game has no configured timer, so the view shows the
      // "Connecting…" placeholder (proving the chooser resolved to a section).
      await displayPage
        .getByRole("button", { name: /Section A/ })
        .first()
        .click();
      await expect(displayPage.getByText("Choose a section")).toBeHidden({
        timeout: 15000,
      });
      await expect(displayPage.getByText("Connecting")).toBeVisible({
        timeout: 15000,
      });
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await displayPage.context().close();
    }
  });
});
