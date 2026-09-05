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
});
