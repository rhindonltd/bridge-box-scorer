import { test, expect, type Page } from "@playwright/test";
import {
  closeDevices,
  directorStorage,
  newDevice,
  seatStorage,
  seedGame,
} from "../fixtures/seeded-game";
import { deriveAdminKey } from "../fixtures/settings";

/**
 * Director security alerts.
 *
 * Every director device gets a popup when someone becomes a director (share
 * code or admin key) or unlocks Settings, and when one device fails three
 * times in quick succession (which also blocks it for five minutes). The
 * popup says who the device is when it holds a seat at a game being played.
 * The device that signed in doesn't see its own alert.
 *
 * Each simulated device is its own device for the failure count (the e2e
 * server trusts a per-context test id), and these devices keep their popups
 * so they can be checked.
 */

const KEEP = { keepDirectorAlerts: true };

/**
 * Dismiss whatever is showing. Earlier journeys in the same run may have left
 * Settings alerts that are replayed to any new director device for 30 minutes.
 */
async function clearAlerts(page: Page): Promise<void> {
  // Give the device a moment to prove its tokens and receive any replay.
  await page.waitForTimeout(1000);
  const dismiss = page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Dismiss" });
  while ((await dismiss.count()) > 0) await dismiss.first().click();
}

async function directorDevice(
  browser: import("@playwright/test").Browser,
  game: Awaited<ReturnType<typeof seedGame>>,
): Promise<Page> {
  const context = await newDevice(browser, directorStorage(game), KEEP);
  const page = await context.newPage();
  await page.goto(`/game/${game.gameId}/manage`);
  await clearAlerts(page);
  await expect(page.getByRole("button", { name: "Delete Game" })).toBeVisible({
    timeout: 15000,
  });
  return page;
}

/** A device seated at A1NS, opened on Manage Game's list. */
async function seatedDevice(
  browser: import("@playwright/test").Browser,
  game: Awaited<ReturnType<typeof seedGame>>,
): Promise<Page> {
  const context = await newDevice(browser, seatStorage(game, "A1NS"), KEEP);
  return context.newPage();
}

async function openBecomeDirector(page: Page, eventName: string) {
  await page.goto("/manage");
  await page.getByRole("button", { name: new RegExp(eventName) }).click();
  const input = page.locator("#share-code");
  await expect(input).toBeVisible({ timeout: 15000 });
  return input;
}

const SEATED_AS = (eventName: string) =>
  `PA1NS North & PA1NS South (Table 1 NS, ${eventName})`;

test.describe("Director security alerts", () => {
  test("the director is told who became a director with the admin key; the new director isn't", async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    const adminKey = deriveAdminKey();
    test.skip(!adminKey, "No admin key label file on this machine.");
    const eventName = `Alerts Sign In ${Date.now()}`;
    const game = await seedGame({ scoring: "MP", tables: 3, eventName });
    const director = await directorDevice(browser, game);
    const other = await seatedDevice(browser, game);
    try {
      const input = await openBecomeDirector(other, eventName);
      await input.fill(adminKey!);
      await other.getByRole("button", { name: "Claim Access" }).click();
      await other.waitForURL(new RegExp(`/game/${game.gameId}/manage$`), {
        timeout: 15000,
      });

      // The existing director sees who it was and how.
      const alert = director.getByRole("alertdialog");
      await expect(alert).toBeVisible({ timeout: 15000 });
      await expect(alert).toContainText(
        `${SEATED_AS(eventName)} became a director of ${eventName} using the admin key.`,
      );

      // The device that signed in doesn't get its own alert, live or replayed
      // (it may be shown older Settings alerts now that it's a director).
      await other.reload();
      await other.waitForTimeout(1500);
      await expect(
        other.getByText(`became a director of ${eventName}`),
      ).toHaveCount(0);

      // Dismissing removes it, and it stays dismissed after a reload.
      await alert.getByRole("button", { name: "Dismiss" }).click();
      await expect(alert).toHaveCount(0);
      await director.reload();
      await director.waitForTimeout(1500);
      await expect(director.getByRole("alertdialog")).toHaveCount(0);
    } finally {
      await closeDevices(director, other);
    }
  });

  test("three wrong codes in quick succession alert the director and block the device", async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    const eventName = `Alerts Break In ${Date.now()}`;
    const game = await seedGame({ scoring: "MP", tables: 3, eventName });
    const director = await directorDevice(browser, game);
    const intruder = await seatedDevice(browser, game);
    try {
      const input = await openBecomeDirector(intruder, eventName);
      const claim = intruder.getByRole("button", { name: "Claim Access" });
      for (const guess of ["AAAAAA", "BBBBBB", "CCCCCC"]) {
        await input.fill(guess);
        await claim.click();
        await expect(
          intruder.getByText("That isn't a valid share code or the admin key."),
        ).toBeVisible({ timeout: 15000 });
      }

      const alert = director.getByRole("alertdialog");
      await expect(alert).toBeVisible({ timeout: 15000 });
      await expect(alert).toContainText(
        `${SEATED_AS(eventName)} made 3 failed attempts to become a director of ${eventName} in the last 2 minutes. Further attempts from that device are blocked for 5 minutes.`,
      );

      // A fourth attempt, even a right one, is refused for now.
      await input.fill("DDDDDD");
      await claim.click();
      await expect(
        intruder.getByText("Too many attempts. Try again in 5 minutes."),
      ).toBeVisible({ timeout: 15000 });
    } finally {
      await closeDevices(director, intruder);
    }
  });

  test("unlocking Settings alerts every director device, but not the one that unlocked", async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    const adminKey = deriveAdminKey();
    test.skip(!adminKey, "No admin key label file on this machine.");
    const game = await seedGame({
      scoring: "MP",
      tables: 3,
      eventName: `Alerts Settings ${Date.now()}`,
    });
    const director = await directorDevice(browser, game);
    // A second director of the same game unlocks Settings on its own device.
    const unlocker = await directorDevice(browser, game);
    try {
      await unlocker.goto("/settings");
      await unlocker.locator("#admin-key").fill(adminKey!);
      await unlocker.getByRole("button", { name: "Unlock" }).click();
      await expect(
        unlocker.getByRole("link", { name: "WiFi Settings" }),
      ).toBeVisible({ timeout: 15000 });

      const alert = director.getByRole("alertdialog");
      await expect(alert).toBeVisible({ timeout: 15000 });
      await expect(alert).toContainText(
        "A device that isn't seated at a game unlocked this Bridge Box's Settings using the admin key.",
      );

      await unlocker.waitForTimeout(1000);
      await expect(unlocker.getByRole("alertdialog")).toHaveCount(0);
    } finally {
      await closeDevices(director, unlocker);
    }
  });
});
