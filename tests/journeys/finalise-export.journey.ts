import { test, expect, type Browser, type Page } from "@playwright/test";
import {
  closeDevices,
  directorStorage,
  newDevice,
  seedGame,
  type SeedGameOptions,
  type SeedGameResult,
} from "../fixtures/seeded-game";
import { finaliseGame } from "../fixtures/game-setup";
import { fetchAdminToken } from "../fixtures/settings";
import { gotoStable } from "./support";

/**
 * Finalise Game and Export Game.
 *
 * Under Manage Game the director taps Finalise Game. It lists what still stops
 * the game being finalised (results outstanding) and, once every result is in,
 * finalises it after a confirmation. A finalised game is read-only, leaves
 * Manage Games and appears under Export Game on the main menu, where anyone
 * (players included) can download the results; only a director sees the
 * uploads, the tournament level and Reopen game.
 *
 * Club details are a device setting shared by every journey on the one test
 * server, so the full-cycle test saves them through the admin API.
 */

/** Seed a game and open a director device on its manage menu. */
async function directorFor(
  browser: Browser,
  options: SeedGameOptions,
): Promise<{ page: Page; game: SeedGameResult }> {
  const game = await seedGame({
    scoring: "MP",
    tables: 2,
    movement: "recommended",
    leadCardRequired: false,
    ...options,
  });
  const context = await newDevice(browser, directorStorage(game));
  const page = await context.newPage();
  await gotoStable(page, `/game/${game.gameId}/manage`);
  return { page, game };
}

test.describe("Finalise Game and Export Game", () => {
  test("an outstanding result blocks finalising and keeps the exports closed", async ({
    browser,
    request,
  }) => {
    test.setTimeout(120_000);
    const { page, game } = await directorFor(browser, {
      play: "all",
      holdBack: ["1@1/1"],
      eventName: `Finalise blocked ${Date.now()}`,
    });
    try {
      // The manage menu offers Finalise Game (no more Export & Publish).
      await expect(
        page.getByRole("button", { name: "Finalise Game" }),
      ).toBeVisible({ timeout: 15000 });
      await expect(
        page.getByRole("button", { name: "Export & Publish" }),
      ).toHaveCount(0);
      await page.getByRole("button", { name: "Finalise Game" }).click();
      await page.waitForURL(
        new RegExp(`/game/${game.gameId}/manage/finalise$`),
      );

      // The outstanding board is named, with who is seated for it.
      await expect(
        page.getByText("Resolve the following before finalising the game:"),
      ).toBeVisible({ timeout: 15000 });
      await expect(
        page.getByText(
          "No result yet: Round 1 · Table 1 · Board 1 (PA1NS North & PA1NS South vs PA1EW North & PA1EW South).",
        ),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Finalise game" }),
      ).toHaveCount(0);

      // Nothing can be exported yet: the export page bounces a director back
      // to the Finalise check, and the downloads are refused by the server.
      await gotoStable(page, `/game/${game.gameId}/export`);
      await page.waitForURL(
        new RegExp(`/game/${game.gameId}/manage/finalise$`),
        {
          timeout: 15000,
        },
      );
      expect(
        (await request.get(`/api/games/${game.gameId}/pbn`)).status(),
      ).toBe(403);
      expect(
        (await request.get(`/api/games/${game.gameId}/usebio`)).status(),
      ).toBe(403);
    } finally {
      await closeDevices(page);
    }
  });

  test("finalise, export as a player, stay read-only, then reopen", async ({
    browser,
    request,
  }) => {
    test.setTimeout(180_000);
    const eventName = `Finalise cycle ${Date.now()}`;
    const { page: director, game } = await directorFor(browser, {
      play: "all",
      eventName,
    });
    const playerContext = await newDevice(browser);
    const player = await playerContext.newPage();
    try {
      const adminToken = await fetchAdminToken(request);
      const clubRes = await request.post("/api/system/club", {
        headers: { "x-admin-token": adminToken },
        data: { name: "E2E Bridge Club", clubNumber: "12345" },
      });
      expect(clubRes.ok()).toBe(true);

      // Every result is in, so the director can finalise. That returns to the
      // main menu.
      await finaliseGame(director, game.gameId);

      // The game has left Manage Games...
      await gotoStable(director, "/manage");
      await expect(director.getByText(eventName)).toHaveCount(0, {
        timeout: 15000,
      });

      // ...and is listed under Export Game, for a player as well as the director.
      await gotoStable(player, "/");
      await player.getByRole("link", { name: "Export Game" }).click();
      await player.waitForURL((url) => url.pathname === "/export");
      await player.getByText(eventName).click();
      await player.waitForURL(new RegExp(`/game/${game.gameId}/export$`));

      // The player can download, but sees no director controls.
      await expect(
        player.getByRole("button", { name: "Download USEBIO" }),
      ).toBeVisible({ timeout: 15000 });
      await expect(
        player.getByRole("button", { name: "Download PBN" }),
      ).toBeVisible();
      await expect(
        player.getByRole("button", { name: "Reopen game" }),
      ).toHaveCount(0);
      await expect(
        player.getByRole("button", { name: "Submit to EBU" }),
      ).toHaveCount(0);

      // The player downloads the USEBIO file without being a director.
      await player.getByRole("button", { name: "Download USEBIO" }).click();
      await player.waitForURL(
        new RegExp(`/game/${game.gameId}/export/download-usebio$`),
      );
      const downloadPromise = player.waitForEvent("download", {
        timeout: 15000,
      });
      await player.getByRole("button", { name: "Download USEBIO" }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.xml$/);

      // The uploads and Reopen are refused for anyone without the director
      // token, and the game refuses changes while it is finalised.
      expect(
        (await request.post(`/api/games/${game.gameId}/ebu/upload`)).status(),
      ).toBe(401);
      const edit = await request.patch(`/api/games/${game.gameId}`, {
        headers: { "x-director-token": game.directorToken },
        data: { eventName: "Renamed while finalised" },
      });
      expect(edit.status()).toBe(409);

      // The director's export page shows the director controls.
      await gotoStable(director, `/game/${game.gameId}/export`);
      await expect(
        director.getByRole("button", { name: "Reopen game" }),
      ).toBeVisible({ timeout: 15000 });
      await director.getByRole("button", { name: "Reopen game" }).click();
      await director
        .getByRole("button", { name: "Reopen", exact: true })
        .click();
      await director.waitForURL((url) => url.pathname === "/", {
        timeout: 15000,
      });

      // Reopened: back in Manage Games, gone from Export Game, editable, and
      // the downloads close again.
      await gotoStable(director, "/manage");
      await expect(director.getByText(eventName)).toBeVisible({
        timeout: 15000,
      });
      await gotoStable(player, "/export");
      await expect(player.getByText(eventName)).toHaveCount(0, {
        timeout: 15000,
      });
      expect(
        (await request.get(`/api/games/${game.gameId}/usebio`)).status(),
      ).toBe(403);
      const editAgain = await request.patch(`/api/games/${game.gameId}`, {
        headers: { "x-director-token": game.directorToken },
        data: { eventName },
      });
      expect(editAgain.ok()).toBe(true);
    } finally {
      await closeDevices(director, player);
    }
  });

  test("a player cannot open the export page of a game that is not finalised", async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    const { page: director, game } = await directorFor(browser, {
      play: "all",
      eventName: `Export not finalised ${Date.now()}`,
    });
    const playerContext = await newDevice(browser);
    const player = await playerContext.newPage();
    try {
      await gotoStable(player, `/game/${game.gameId}/export`);
      await player.waitForURL((url) => url.pathname === "/", {
        timeout: 15000,
      });
    } finally {
      await closeDevices(director, player);
    }
  });
});
