import { test, expect, type Browser, type Page } from "@playwright/test";

import {
  closeDevices,
  directorStorage,
  newDevice,
  seedGame,
  type SeedGameOptions,
} from "../fixtures/seeded-game";
import { gotoStable } from "./support";

/**
 * The Export & Publish hub: Manage > Export & Publish opens a readiness
 * checklist (results in, club information, BridgeWebs, EBU), and "Continue to
 * Export Options" opens the options menu that gates each export.
 *
 * The individual download / upload screens have their own journeys (usebio,
 * pbn, bridgewebs-upload, ebu-upload); this covers the two screens in front of
 * them, including the outstanding-boards list behind the results check.
 *
 * Club / BridgeWebs / EBU details are device settings shared by every journey
 * on the one test server, so each test presents the state it needs by answering
 * those three reads in the browser. The game state (what is played) is seeded.
 */

interface DeviceSettings {
  club: boolean;
  bridgewebs: boolean;
  ebu: boolean;
}

/** Answer the device-settings reads as configured / not configured. */
async function presentSettings(page: Page, s: DeviceSettings): Promise<void> {
  const reply = (result: unknown) =>
    JSON.stringify({ success: true, result });
  const fulfillGet = (path: string, result: unknown) =>
    page.route(`**${path}`, (route) =>
      route.request().method() === "GET"
        ? route.fulfill({
            status: 200,
            contentType: "application/json",
            body: reply(result),
          })
        : route.continue(),
    );
  await fulfillGet("/api/system/club", {
    club: s.club ? { name: "E2E Bridge Club", clubNumber: "9999" } : null,
  });
  await fulfillGet("/api/system/bridgewebs", {
    configured: s.bridgewebs,
    club: s.bridgewebs ? "e2eclub" : null,
  });
  await fulfillGet("/api/system/ebu", {
    configured: s.ebu,
    ebuNumber: s.ebu ? "9999" : null,
  });
}

/** Seed a game and open its manage menu with the given device settings. */
async function directorWith(
  browser: Browser,
  options: SeedGameOptions,
  settings: DeviceSettings,
): Promise<{ page: Page; gameId: string }> {
  const game = await seedGame({
    scoring: "MP",
    tables: 2,
    movement: "recommended",
    leadCardRequired: false,
    ...options,
  });
  const context = await newDevice(browser, directorStorage(game));
  const page = await context.newPage();
  await presentSettings(page, settings);
  await gotoStable(page, `/game/${game.gameId}/manage`);
  return { page, gameId: game.gameId };
}

/**
 * A checklist row on the readiness screen, by its title. Matched on the row's
 * title line (which reads "<title>— <status>" to a screen reader) so a title
 * mentioned in another row's detail ("…EBU number…") doesn't match.
 */
function checkItem(page: Page, title: string) {
  const esc = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return page
    .getByRole("listitem")
    .filter({ has: page.locator("p", { hasText: new RegExp(`^${esc}—`) }) })
    .first();
}

const ALL_CONFIGURED: DeviceSettings = { club: true, bridgewebs: true, ebu: true };
const NONE_CONFIGURED: DeviceSettings = {
  club: false,
  bridgewebs: false,
  ebu: false,
};

test.describe("Export & Publish hub", () => {
  test("an outstanding board is a warning that lists who still has to play it, and the options wait for it", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const { page, gameId } = await directorWith(
      browser,
      {
        play: "all",
        holdBack: ["1@1/1"],
        eventName: `Export hub outstanding ${Date.now()}`,
      },
      ALL_CONFIGURED,
    );
    try {
      // The manage menu's Export & Publish button opens the readiness screen.
      await page.getByRole("button", { name: "Export & Publish" }).click();
      await page.waitForURL(new RegExp(`/game/${gameId}/manage/export$`));

      await expect(
        page.getByText(
          "You can export now, but some results are still outstanding.",
        ),
      ).toBeVisible({ timeout: 15000 });
      const results = checkItem(page, "Results entered");
      await expect(results).toContainText(/1 of \d+ results is outstanding\./);
      await expect(results).toContainText("Warning");
      for (const title of ["Club information", "BridgeWebs", "EBU"]) {
        await expect(checkItem(page, title)).toContainText("Ready");
      }

      // The one outstanding board is listed behind a tap, with the pairs
      // seated for it (round 1, table 1: the pairs that started there).
      const toggle = page.getByRole("button", { name: /Results entered/ });
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await expect(results).toContainText("Tap to see which");
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      await expect(results).toContainText("Round 1 · Table 1 · Board 1");
      await expect(results).toContainText(
        "PA1NS North & PA1NS South vs PA1EW North & PA1EW South",
      );

      // The options: everything that needs results waits for the last one;
      // the PBN (deals, not results) is available now.
      await page
        .getByRole("button", { name: "Continue to Export Options" })
        .click();
      await page.waitForURL(new RegExp(`/game/${gameId}/manage/export/options$`));
      await expect(
        page.getByRole("button", { name: "Download PBN" }),
      ).toBeEnabled({ timeout: 15000 });
      for (const name of [
        "Download USEBIO",
        "Upload to BridgeWebs",
        "Submit to EBU",
      ]) {
        await expect(page.getByRole("button", { name })).toBeDisabled();
      }
    } finally {
      await closeDevices(page);
    }
  });

  test("a complete game with nothing set up: missing club information blocks, the publishers are optional and hidden", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const { page, gameId } = await directorWith(
      browser,
      { play: "all", eventName: `Export hub unconfigured ${Date.now()}` },
      NONE_CONFIGURED,
    );
    try {
      await gotoStable(page, `/game/${gameId}/manage/export`);
      await expect(
        page.getByText("Some results files can't be generated yet."),
      ).toBeVisible({ timeout: 15000 });

      const results = checkItem(page, "Results entered");
      await expect(results).toContainText(/All \d+ results are in\./);
      await expect(results).toContainText("Ready");
      // Nothing outstanding, so there is no list to open.
      await expect(
        page.getByRole("button", { name: /Results entered/ }),
      ).toHaveCount(0);

      await expect(checkItem(page, "Club information")).toContainText(
        "Not ready",
      );
      await expect(checkItem(page, "BridgeWebs")).toContainText("Optional");
      await expect(checkItem(page, "EBU")).toContainText("Optional");

      // Continue is never blocked. The options offer the downloads; the
      // uploads aren't offered at all until they are set up.
      await page
        .getByRole("button", { name: "Continue to Export Options" })
        .click();
      await page.waitForURL(new RegExp(`/game/${gameId}/manage/export/options$`));
      await expect(
        page.getByRole("button", { name: "Download USEBIO" }),
      ).toBeEnabled({ timeout: 15000 });
      await expect(
        page.getByRole("button", { name: "Download PBN" }),
      ).toBeEnabled();
      await expect(
        page.getByRole("button", { name: "Upload to BridgeWebs" }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Submit to EBU" }),
      ).toHaveCount(0);

      // Each option opens its own screen.
      await page.getByRole("button", { name: "Download PBN" }).click();
      await page.waitForURL(new RegExp(`/game/${gameId}/manage/download-pbn$`));
    } finally {
      await closeDevices(page);
    }
  });

  test("with everything in and set up, every export is available", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const { page, gameId } = await directorWith(
      browser,
      { play: "all", eventName: `Export hub ready ${Date.now()}` },
      ALL_CONFIGURED,
    );
    try {
      await gotoStable(page, `/game/${gameId}/manage/export`);
      await expect(page.getByText("Everything is ready to export.")).toBeVisible(
        { timeout: 15000 },
      );
      await page
        .getByRole("button", { name: "Continue to Export Options" })
        .click();
      await page.waitForURL(new RegExp(`/game/${gameId}/manage/export/options$`));
      for (const name of [
        "Download USEBIO",
        "Download PBN",
        "Upload to BridgeWebs",
        "Submit to EBU",
      ]) {
        await expect(page.getByRole("button", { name })).toBeEnabled({
          timeout: 15000,
        });
      }
    } finally {
      await closeDevices(page);
    }
  });
});
