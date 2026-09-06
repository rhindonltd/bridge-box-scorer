import { test, expect } from "@playwright/test";

import { deleteGame } from "../fixtures/delete-game";
import { newParticipant, setUpStartedTwoTableGame } from "./support";

/**
 * Share-code co-director round-trip (pure UI, no socket seam).
 *
 * Director access is per-device: the creating device holds the director token.
 * To let a second device manage the game, the director generates a short share
 * code which the other device claims. This journey drives the full round-trip
 * across two isolated contexts (separate localStorage, like two phones):
 *
 *   1. Device A (the creator/director) opens Share Director Access and reads
 *      the generated 6-char code.
 *   2. Device B — which is NOT a director for the game — goes to /manage,
 *      selects the game (which prompts for the code), claims it, and lands on
 *      the manage menu with director-only actions.
 *   3. A wrong code shows the "Invalid code" error.
 */

test.describe("Share director access round-trip", () => {
  test("a second device claims a share code and can manage the game", async ({
    browser,
  }) => {
    test.setTimeout(90_000);

    const eventName = `Share Code ${Date.now()}`;
    const { directorPage, gameId } = await setUpStartedTwoTableGame(
      browser,
      eventName,
      { recordOpeningLead: false },
    );

    // Device B: a fresh context with no director token for this game.
    const deviceB = await newParticipant(browser);

    try {
      // Device A generates a share code on the Share Director Access page.
      await directorPage.goto(`/game/${gameId}/manage/share-access`);
      const codeEl = directorPage.getByTestId("share-code");
      await expect(codeEl).toBeVisible({ timeout: 15000 });
      const code = (await codeEl.textContent())?.trim() ?? "";
      expect(code).toMatch(/^[A-Z0-9]{6}$/);

      // Device B: from /manage, selecting the game (not a director) opens the
      // claim screen. Select by the unique event name.
      await deviceB.goto("/manage");
      await deviceB
        .getByRole("button", { name: new RegExp(eventName) })
        .click();

      // Claim view: enter the code and submit.
      const input = deviceB.locator("#share-code");
      await expect(input).toBeVisible({ timeout: 15000 });
      await input.fill(code);
      await deviceB.getByRole("button", { name: "Claim Access" }).click();

      // Device B lands on the manage menu and sees director-only actions.
      await deviceB.waitForURL(new RegExp(`/game/${gameId}/manage$`), {
        timeout: 15000,
      });
      await expect(
        deviceB.getByRole("button", { name: "Share Director Access" }),
      ).toBeVisible({ timeout: 15000 });
      await expect(
        deviceB.getByRole("button", { name: "Delete Game" }),
      ).toBeVisible();
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await deviceB.context().close();
    }
  });

  test("an invalid share code is rejected", async ({ browser }) => {
    test.setTimeout(90_000);

    const eventName = `Share Code Invalid ${Date.now()}`;
    const { directorPage, gameId } = await setUpStartedTwoTableGame(
      browser,
      eventName,
      { recordOpeningLead: false },
    );

    const deviceB = await newParticipant(browser);

    try {
      await deviceB.goto("/manage");
      await deviceB
        .getByRole("button", { name: new RegExp(eventName) })
        .click();

      const input = deviceB.locator("#share-code");
      await expect(input).toBeVisible({ timeout: 15000 });
      // A syntactically valid but non-existent 6-char code.
      await input.fill("ZZZZZZ");
      await deviceB.getByRole("button", { name: "Claim Access" }).click();

      // Scope to the claim view's error paragraph (Next's route announcer also
      // has role=alert, so match the visible error text directly).
      await expect(deviceB.getByText("Invalid code")).toBeVisible({
        timeout: 15000,
      });
      // Still on the claim screen, not navigated into manage.
      await expect(deviceB).toHaveURL(/\/manage$/);
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await deviceB.context().close();
    }
  });

  test("the share-access page shows a mm:ss countdown and regenerates on demand", async ({
    browser,
  }) => {
    test.setTimeout(90_000);

    const eventName = `Share Code Countdown ${Date.now()}`;
    const { directorPage, gameId } = await setUpStartedTwoTableGame(
      browser,
      eventName,
      { recordOpeningLead: false },
    );

    try {
      await directorPage.goto(`/game/${gameId}/manage/share-access`);
      const codeEl = directorPage.getByTestId("share-code");
      await expect(codeEl).toBeVisible({ timeout: 15000 });
      const firstCode = (await codeEl.textContent())?.trim() ?? "";
      expect(firstCode).toMatch(/^[A-Z0-9]{6}$/);

      // The countdown starts at 5:00 and ticks down in mm:ss form (seconds
      // zero-padded). It begins at "Expires in 5:00" and moves to 4:5x within
      // a couple of seconds.
      await expect(
        directorPage.getByText(/Expires in 5:00/),
      ).toBeVisible({ timeout: 5000 });
      await expect(
        directorPage.getByText(/Expires in 4:5\d/),
      ).toBeVisible({ timeout: 5000 });

      // "Generate New Code" issues a fresh, different code and resets the
      // countdown.
      await directorPage
        .getByRole("button", { name: "Generate New Code" })
        .click();
      await expect(codeEl).toBeVisible({ timeout: 15000 });
      await expect
        .poll(async () => (await codeEl.textContent())?.trim(), {
          timeout: 15000,
        })
        .not.toBe(firstCode);
      const secondCode = (await codeEl.textContent())?.trim() ?? "";
      expect(secondCode).toMatch(/^[A-Z0-9]{6}$/);
      await expect(
        directorPage.getByText(/Expires in [45]:\d{2}/),
      ).toBeVisible({ timeout: 5000 });
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
    }
  });

  test("a share code cannot be claimed twice", async ({ browser }) => {
    test.setTimeout(120_000);

    const eventName = `Share Code Reuse ${Date.now()}`;
    const { directorPage, gameId } = await setUpStartedTwoTableGame(
      browser,
      eventName,
      { recordOpeningLead: false },
    );

    const deviceB = await newParticipant(browser);
    const deviceC = await newParticipant(browser);

    try {
      // Device A generates a code.
      await directorPage.goto(`/game/${gameId}/manage/share-access`);
      const codeEl = directorPage.getByTestId("share-code");
      await expect(codeEl).toBeVisible({ timeout: 15000 });
      const code = (await codeEl.textContent())?.trim() ?? "";
      expect(code).toMatch(/^[A-Z0-9]{6}$/);

      // Device B claims it successfully (marks it used).
      await deviceB.goto("/manage");
      await deviceB
        .getByRole("button", { name: new RegExp(eventName) })
        .click();
      const inputB = deviceB.locator("#share-code");
      await expect(inputB).toBeVisible({ timeout: 15000 });
      await inputB.fill(code);
      await deviceB.getByRole("button", { name: "Claim Access" }).click();
      await deviceB.waitForURL(new RegExp(`/game/${gameId}/manage$`), {
        timeout: 15000,
      });

      // Device C tries the SAME code: it has already been used, so the claim is
      // rejected and Device C stays on the claim screen.
      await deviceC.goto("/manage");
      await deviceC
        .getByRole("button", { name: new RegExp(eventName) })
        .click();
      const inputC = deviceC.locator("#share-code");
      await expect(inputC).toBeVisible({ timeout: 15000 });
      await inputC.fill(code);
      await deviceC.getByRole("button", { name: "Claim Access" }).click();

      await expect(
        deviceC.getByText("Code has already been used"),
      ).toBeVisible({ timeout: 15000 });
      await expect(deviceC).toHaveURL(/\/manage$/);
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await deviceB.context().close();
      await deviceC.context().close();
    }
  });
});
