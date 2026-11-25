import { test, expect } from "@playwright/test";

import { createGame } from "../fixtures/game-create";
import { deleteGame } from "../fixtures/delete-game";
import { newParticipant, gotoStable } from "./support";

/**
 * Navigation & game-selection journey.
 *
 * Covers the main menu links + settings cog, the manage/display game
 * selectors, SelectGame row content, select→navigate for join/display/manage,
 * the not-found screen for an unknown game, and the joinable-games live update
 * + reconnect refetch across two contexts.
 *
 * (The top-level error boundary is covered by a component unit test —
 * `src/app/error.test.tsx` — since there is no non-contrived UI route that
 * throws to it. The `/manage` non-director → claim path is covered by
 * `share-code.journey.ts`.)
 */

test.describe("Navigation & selection", () => {
  test("main menu shows the primary links and the settings cog", async ({
    browser,
  }) => {
    const page = await newParticipant(browser);
    try {
      await page.goto("/");
      await expect(page.getByRole("link", { name: "Join Game" })).toBeVisible({
        timeout: 15000,
      });
      await expect(
        page.getByRole("link", { name: "Create Game" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Manage Game" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Export Game" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Display Game" }),
      ).toBeVisible();

      // Settings cog navigates to /settings.
      await page.getByRole("link", { name: "Settings" }).click();
      await expect(page).toHaveURL(/\/settings$/);
    } finally {
      await page.context().close();
    }
  });

  test("a created game appears in the create/join/display selectors (not manage) and navigates", async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const page = await newParticipant(browser);
    const eventName = `Nav Select ${Date.now()}`;
    let gameId = "";

    try {
      const created = await createGame(page, {
        eventName,
        recordOpeningLead: false,
      });
      gameId = created.gameId;

      // The game hasn't started, so it is listed under Create Game (below its
      // "New Game" button), not under Manage Game.
      await gotoStable(page, "/create");
      await expect(
        page.getByRole("link", { name: "New Game", exact: true }),
      ).toHaveAttribute("href", "/create/new", { timeout: 15000 });
      const createRow = page.getByRole("button", {
        name: new RegExp(eventName),
      });
      await expect(createRow).toBeVisible({ timeout: 15000 });
      // As the local director, selecting goes straight to its setup screens.
      await createRow.click();
      await expect(page).toHaveURL(new RegExp(`/game/${gameId}/create`), {
        timeout: 15000,
      });
      // It opens the setup menu; each button goes to the page the setup
      // screens' hamburger menu offers, and the back arrow returns here.
      const timer = page.getByRole("button", { name: "Timer", exact: true });
      await expect(timer).toBeVisible({ timeout: 15000 });
      await expect(
        page.getByRole("button", { name: "Delete Game", exact: true }),
      ).toBeVisible();
      await timer.click();
      await expect(page).toHaveURL(/step=timer/, { timeout: 15000 });
      await page.getByRole("button", { name: "Go back" }).click();
      await expect(timer).toBeVisible({ timeout: 15000 });
      // Start Game has a back arrow to the menu too.
      await page
        .getByRole("button", { name: "Start Game", exact: true })
        .click();
      await expect(page).toHaveURL(/step=start/, { timeout: 15000 });
      await page.getByRole("button", { name: "Go back" }).click();
      await expect(timer).toBeVisible({ timeout: 15000 });
      // The menu's own back arrow returns to the list of games not yet started.
      await page.getByRole("link", { name: "Go back" }).click();
      await expect(page).toHaveURL(/\/create$/, { timeout: 15000 });
      await expect(
        page.getByRole("button", { name: new RegExp(eventName) }),
      ).toBeVisible({ timeout: 15000 });
      // Wait for the Manage Game list to load before checking it's absent.
      const manageList = page.waitForResponse((r) =>
        r.url().endsWith("/api/games/all"),
      );
      await gotoStable(page, "/manage");
      await manageList;
      await expect(
        page.getByRole("button", { name: new RegExp(eventName) }),
      ).toHaveCount(0);

      // /display selector navigates to the display route.
      await gotoStable(page, "/display");
      const displayRow = page.getByRole("button", {
        name: new RegExp(eventName),
      });
      await expect(displayRow).toBeVisible({ timeout: 15000 });
      await displayRow.click();
      await expect(page).toHaveURL(new RegExp(`/game/${gameId}/display`), {
        timeout: 15000,
      });

      // /join selector navigates to the join route.
      await gotoStable(page, "/join");
      const joinRow = page.getByRole("button", { name: new RegExp(eventName) });
      await expect(joinRow).toBeVisible({ timeout: 15000 });
      await joinRow.click();
      await expect(page).toHaveURL(new RegExp(`/game/${gameId}/join`), {
        timeout: 15000,
      });
    } finally {
      if (gameId) await deleteGame(page, gameId);
      await page.context().close();
    }
  });

  test("an unknown game route renders the not-found screen", async ({
    browser,
  }) => {
    const page = await newParticipant(browser);
    try {
      await page.goto("/game/does-not-exist-xyz/manage");
      await expect(page.getByText("Page not found")).toBeVisible({
        timeout: 15000,
      });
      await expect(
        page.getByRole("link", { name: "Back to Menu" }),
      ).toBeVisible();
    } finally {
      await page.context().close();
    }
  });

  test("the joinable-games list live-updates and recovers on reconnect", async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    const directorPage = await newParticipant(browser);
    const viewerPage = await newParticipant(browser);
    const eventName = `Nav Live ${Date.now()}`;
    let gameId = "";

    try {
      // Viewer opens the join list first (before the game exists).
      await viewerPage.goto("/join");
      await expect(
        viewerPage.getByRole("button", { name: new RegExp(eventName) }),
      ).toHaveCount(0);

      // Director creates a game; it appears in the viewer's list live
      // (joinable-games broadcast).
      const created = await createGame(directorPage, {
        eventName,
        recordOpeningLead: false,
      });
      gameId = created.gameId;
      await expect(
        viewerPage.getByRole("button", { name: new RegExp(eventName) }),
      ).toBeVisible({ timeout: 15000 });

      // Drop + restore the viewer's socket; the list refetches on reconnect and
      // still shows the game.
      await viewerPage.context().setOffline(true);
      await viewerPage.waitForTimeout(1000);
      await viewerPage.context().setOffline(false);
      await expect(
        viewerPage.getByRole("button", { name: new RegExp(eventName) }),
      ).toBeVisible({ timeout: 20000 });
    } finally {
      if (gameId) await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await viewerPage.context().close();
    }
  });
});
