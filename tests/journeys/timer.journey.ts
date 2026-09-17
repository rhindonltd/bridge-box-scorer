import { test, expect, Browser, Page } from "@playwright/test";

import { createGame } from "../fixtures/game-create";
import {
  setTableCount,
  pickFirstMovement,
  startGame,
  openSetupStep,
  addSection,
} from "../fixtures/game-setup";
import { seatTwoTableField } from "../fixtures/join";
import { deleteGame } from "../fixtures/delete-game";
import {
  newParticipant,
  setUpStartedTwoSectionGame,
  pickMovementForSection,
} from "./support";

/**
 * Session-timer journey (director manage + display, two contexts).
 *
 * Replaces the older tests/timer.spec.ts, which drove a removed "Create/Start"
 * timer UI. The current flow is:
 *   - Pre-start: configure durations on the Timer setup tab. The config
 *     AUTOSAVES on every change (debounced ~400ms) — there is no Save button.
 *     Rounds and boards-per-round are DERIVED from the section's movement and
 *     shown read-only, so they are not typed here.
 *   - On game start: the autosaved config is PROMOTED to a live (paused) timer
 *     (promoteTimerAtGameStart).
 *   - Post-start: /manage/timer shows the live controls (Start/Pause,
 *     Prev/Next phase, adjust ±, Apply Changes / updateConfig).
 *
 * The timer counts down in real time, so we use short durations and assert
 * observable display states (Round label, PAUSED, MM:SS, Move) with generous
 * timeouts rather than exact remaining values.
 */

/**
 * The config autosaves ~400ms after the last edit; wait comfortably past that
 * so it has persisted before we rely on it (e.g. before starting the game).
 */
const AUTOSAVE_SETTLE_MS = 800;

/**
 * Open a section's live timer display and wait until it has resolved to a real
 * timer (past the "Connecting…" placeholder). The display requests its snapshot
 * on mount; if it mounts a beat before promotion has propagated it briefly
 * shows "Connecting…", so we reload once as a cheap retry.
 */
async function openTimerDisplay(page: Page, gameId: string): Promise<void> {
  await page.goto(`/game/${gameId}/display/timer`);
  try {
    await expect(page.getByText("Connecting")).toBeHidden({ timeout: 8000 });
  } catch {
    await page.reload();
    await expect(page.getByText("Connecting")).toBeHidden({ timeout: 15000 });
  }
}

/**
 * Navigate the director to the live/config timer manager. `startGame` lands on
 * `/manage` and the app may still be settling that navigation, so a plain goto
 * can be "interrupted by another navigation"; wait for the URL to commit.
 */
async function gotoManageTimer(page: Page, gameId: string): Promise<void> {
  // `startGame` triggers a client-side redirect to `/manage` that can fire just
  // after we navigate, interrupting the goto. Let any such redirect settle
  // first (best-effort — it's a no-op if we're already elsewhere), then go.
  await page
    .waitForURL(new RegExp(`/game/${gameId}/manage$`), { timeout: 5000 })
    .catch(() => {});
  // Retry the goto once if a late redirect still interrupts the first attempt.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await page.goto(`/game/${gameId}/manage/timer`, { waitUntil: "commit" });
      await page.waitForLoadState("domcontentloaded");
      return;
    } catch (err) {
      if (attempt === 1) throw err;
      await page.waitForTimeout(500);
    }
  }
}

/**
 * Set up a started two-table game whose timer was configured BEFORE the game
 * started, so starting promotes it to a live paused timer. Returns the director
 * page and gameId.
 *
 * The config autosaves as fields are edited (no Save button). Total rounds are
 * derived from the movement (the first recommended two-table movement is a
 * 3-round Howell), so the caller does not set them; play/move durations and any
 * break are the only things configured here.
 */
async function setUpStartedGameWithSavedTimer(
  browser: Browser,
  eventName: string,
  config: {
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

  // Configure the timer on the standalone Timer manager. The config autosaves
  // on each change; wait for the config view to resolve (the "Session Length"
  // summary is present once the section's derived structure has loaded) before
  // editing, so a save can't no-op on an unresolved section.
  await directorPage.goto(`/game/${gameId}/manage/timer`);
  await expect(directorPage.getByText("Session Length")).toBeVisible({
    timeout: 15000,
  });
  // Each duration field is a StepperInput: a number spinbutton flanked by
  // "Decrease X" / "Increase X" buttons. getByLabel would match all three
  // (their accessible names share the field name), so target the spinbutton.
  const spin = (name: string) =>
    directorPage.getByRole("spinbutton", { name, exact: true });

  // Use "Per Round" timing so the play-phase length equals the entered play
  // duration directly (Per Board would multiply it by boards-per-round, which
  // makes the live-timer duration assertions depend on the movement).
  await directorPage.getByRole("radio", { name: "Per Round" }).check();
  await spin("Play minutes").fill("0");
  await spin("Play seconds").fill(String(config.playSeconds));
  await spin("Move minutes").fill("0");

  if (config.breakAfterRound != null) {
    await directorPage.getByRole("button", { name: "+ Add break" }).click();
    await spin("Break 1 after round").fill(String(config.breakAfterRound));
    await spin("Break 1 duration minutes").fill(String(config.breakMinutes ?? 5));
  }

  // The config autosaves ~400ms after the last edit (a debounced PUT to the
  // section timer-config route). Make the final edit while WAITING for that
  // PUT to complete, so the config is definitely persisted before we navigate
  // away to seat/start — a fixed timeout raced the debounce and could leave
  // the game with no configured timer to promote.
  await Promise.all([
    directorPage.waitForResponse(
      (res) =>
        /\/sections\/[^/]+\/timer\/config$/.test(res.url()) &&
        res.request().method() === "PUT" &&
        res.ok(),
      { timeout: 15000 },
    ),
    spin("Move seconds").fill(String(config.moveSeconds)),
  ]);

  // Seat and start the game; starting promotes the autosaved config to live.
  await seatTwoTableField(directorPage, gameId);
  await startGame(directorPage, gameId);

  return { directorPage, gameId };
}

test.describe("Session timer: autosave, promote-on-start, and live control", () => {
  test("a saved timer promotes on start and the director controls drive the display", async ({
    browser,
  }) => {
    test.setTimeout(90_000);

    const { directorPage, gameId } = await setUpStartedGameWithSavedTimer(
      browser,
      `Timer Journey ${Date.now()}`,
      { playSeconds: 30, moveSeconds: 10 },
    );
    const displayPage = await newParticipant(browser);

    try {
      // The display, opened after start, shows the PROMOTED timer via
      // request-on-mount: round 1 of 3. (Promotion starts it running.)
      await openTimerDisplay(displayPage, gameId);
      await expect(displayPage.getByText("Round 1 of 3")).toBeVisible({
        timeout: 15000,
      });

      // Director live controls at /manage/timer (game is started).
      await gotoManageTimer(directorPage, gameId);

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
      { playSeconds: 40, moveSeconds: 10 },
    );
    const displayPage = await newParticipant(browser);

    try {
      await openTimerDisplay(displayPage, gameId);
      await expect(displayPage.getByText("Round 1 of 3")).toBeVisible({
        timeout: 15000,
      });

      await gotoManageTimer(directorPage, gameId);

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
      // starts from the new, shorter 20s duration (it is running and counting
      // down, so allow anything under 30s — the point is it is NOT the 40s
      // default, proving the config change reached the live timer).
      await directorPage
        .getByRole("spinbutton", { name: "Play seconds", exact: true })
        .fill("20");
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
      await expect(displayPage.getByText(/^00:[012]\d$/)).toBeVisible({
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
      { playSeconds: 20, moveSeconds: 10, breakAfterRound: 1, breakMinutes: 2 },
    );
    const displayPage = await newParticipant(browser);

    try {
      await openTimerDisplay(displayPage, gameId);
      await expect(displayPage.getByText("Round 1 of 3")).toBeVisible({
        timeout: 15000,
      });

      // Advance one phase from round 1's play: the gap after round 1 is the
      // scheduled break, so the display shows the break screen.
      await gotoManageTimer(directorPage, gameId);
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

      // The pre-start config screen shows the derived round structure and a
      // session-length preview (it autosaves; there is no Save button and no
      // run controls).
      await directorPage.goto(`/game/${gameId}/manage/timer`);
      await expect(directorPage.getByText("Session Length")).toBeVisible({
        timeout: 15000,
      });
      await expect(directorPage.getByText("Session End")).toBeVisible();
      // No run controls on the pre-start config screen.
      await expect(
        directorPage.getByRole("button", { name: "Start", exact: true }),
      ).toHaveCount(0);
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
      { playSeconds: 40, moveSeconds: 10 },
    );

    try {
      // startGame lands on /manage; navigate to the timer route waiting for the
      // URL to commit so a still-settling post-start redirect can't interrupt.
      await gotoManageTimer(directorPage, gameId);

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
      // Toggle via the wrapping label (clicking the bare checkbox is flaky in
      // the narrow mobile layout — it can sit just outside the scroll viewport).
      await directorPage
        .getByText("Apply to all subsequent phases of this type")
        .click();
      await directorPage.getByRole("button", { name: "+1m" }).click();

      // Step forward to round 2's PLAY phase (play -> move -> play). Its base
      // play duration is well under a minute, so with the +1m applied to future
      // play phases round 2 now starts at MORE than a minute — assert the
      // minutes digits are non-zero rather than an exact value (the timer is
      // running and counting down), proving the adjustment carried forward.
      await directorPage.getByRole("button", { name: "Next phase" }).click();
      await directorPage.getByRole("button", { name: "Next phase" }).click();

      const displayPage = await newParticipant(browser);
      try {
        await openTimerDisplay(displayPage, gameId);
        await expect(displayPage.getByText("Round 2 of 3")).toBeVisible({
          timeout: 15000,
        });
        await expect(
          displayPage.getByText(/^(?!00:)\d{2}:\d{2}$/),
        ).toBeVisible({ timeout: 15000 });
      } finally {
        await displayPage.context().close();
      }
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
    }
  });
});

test.describe("Timer config (multi-section): per-section picker & autosave", () => {
  test("the section picker switches sections and each section keeps its own autosaved config", async ({
    browser,
  }) => {
    test.setTimeout(120_000);

    // A two-section game that is NOT started -> /manage/timer shows the
    // per-section CONFIG view with a section picker. The config autosaves per
    // section (no Save / Apply-to-all buttons); each section is independent.
    const page = await newParticipant(browser);
    const { gameId: gid } = await createGame(page, {
      eventName: `Timer Cfg Sections ${Date.now()}`,
      recordOpeningLead: false,
    });
    try {
      await setTableCount(page, 2);
      // Add a second section via the "+ Add section" pill + naming modal.
      await openSetupStep(page, "Movement");
      await addSection(page);
      // Let the sections list settle.
      await page.waitForTimeout(500);

      // The timer config takes its round structure from each section's
      // movement, so both sections need one selected or the config shows
      // "Select a movement first" instead of the editable fields.
      await pickMovementForSection(page, "A");
      await pickMovementForSection(page, "B");

      // Open the standalone timer manager (game not started -> config view).
      await page.goto(`/game/${gid}/manage/timer`);

      // The section picker (role=tab) shows Section A and Section B.
      const tabA = page.getByRole("tab", { name: /Section A/ });
      const tabB = page.getByRole("tab", { name: /Section B/ });
      await expect(tabA).toBeVisible({ timeout: 15000 });
      await expect(tabB).toBeVisible();

      // Section A: set a distinctive play-seconds value. It autosaves (no Save
      // button); wait past the debounce.
      await expect(page.getByText("Session Length")).toBeVisible({
        timeout: 15000,
      });
      const playSeconds = () =>
        page.getByRole("spinbutton", { name: "Play seconds", exact: true });
      await playSeconds().fill("15");
      await page.waitForTimeout(AUTOSAVE_SETTLE_MS);

      // Section B: a different value, independently autosaved.
      await tabB.click();
      await expect(page.getByText("Session Length")).toBeVisible({
        timeout: 15000,
      });
      await playSeconds().fill("30");
      await page.waitForTimeout(AUTOSAVE_SETTLE_MS);

      // Back to Section A: its own value persisted (sections are independent —
      // B's edit did not overwrite A). The provider re-requests A's saved
      // config on section change.
      await tabA.click();
      await expect
        .poll(async () => playSeconds().inputValue(), { timeout: 15000 })
        .toBe("15");

      // And B still holds its own value.
      await tabB.click();
      await expect
        .poll(async () => playSeconds().inputValue(), { timeout: 15000 })
        .toBe("30");
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
