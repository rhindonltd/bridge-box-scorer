import { test, expect } from "@playwright/test";
import {
  closeDevices,
  openDirector,
  openSeat,
  seedGame,
} from "../fixtures/seeded-game";
import { gotoStable } from "./support";

/**
 * The seeded-game fixture itself: a game created straight into the E2E data
 * dir is visible to the running server, its director token authorises the
 * manage screens, and a seat token planted on a device opens that seat's play
 * screen. Every other seeded journey relies on these three facts.
 */
test.describe("Seeded games", () => {
  test("a seeded game is managed and played from planted tokens", async ({
    browser,
  }) => {
    const game = await seedGame({
      scoring: "MP",
      tables: 2,
      movement: "recommended",
      eventName: `Seeded ${Date.now()}`,
    });
    expect(game.started).toBe(true);
    expect(Object.keys(game.seats)).toEqual(["A1EW", "A1NS", "A2EW", "A2NS"]);

    const director = await openDirector(browser, game);
    const seat = await openSeat(browser, game, "A1NS");
    try {
      await expect(
        director.getByRole("button", { name: "Pairs" }),
      ).toBeVisible();

      await seat.getByRole("button", { name: "Menu" }).click();
      await seat.getByRole("menuitem", { name: "Pair details" }).click();
      await expect(seat.getByText("PA1NS North")).toBeVisible();
    } finally {
      await closeDevices(director, seat);
    }
  });

  test("a scenario is applied: the withdrawn pair shows on the Pairs screen", async ({
    browser,
  }) => {
    const game = await seedGame({
      scoring: "MP",
      rounds: 3,
      play: "partial",
      eventName: `Seeded withdrawal ${Date.now()}`,
      scenario: { withdraw: ["A1NS@3"] },
    });
    expect(game.withdrawnSeats).toEqual(["A1NS"]);
    expect(game.seats.A1NS).toBeUndefined();
    expect(game.retiredTokens.A1NS).toBeTruthy();

    const director = await openDirector(browser, game);
    try {
      await gotoStable(director, `/game/${game.gameId}/manage/pairs`);
      await expect(director.getByText("Withdrew in round 3")).toBeVisible();
    } finally {
      await closeDevices(director);
    }
  });

  test("a finished Howell lists every pair on the leaderboard by name", async ({
    browser,
  }) => {
    // The recommended two-table movement numbers its pairs (the pair seated at
    // A1EW plays as "A4"); the standings must still show the players' names.
    const game = await seedGame({
      scoring: "MP",
      tables: 2,
      movement: "recommended",
      play: "all",
      eventName: `Seeded names ${Date.now()}`,
    });
    const display = await openDirector(
      browser,
      game,
      `/game/${game.gameId}/display/leaderboard`,
    );
    try {
      const rows = display.getByTestId("leaderboard-row");
      await expect(rows).toHaveCount(4, { timeout: 20000 });
      for (const seat of ["A1NS", "A1EW", "A2NS", "A2EW"]) {
        await expect(rows.filter({ hasText: `P${seat} North` })).toHaveCount(1);
      }
      // No row is labelled by a bare movement number instead of a name.
      for (const text of await rows.allInnerTexts()) {
        expect(text).toMatch(/North/);
      }
    } finally {
      await closeDevices(display);
    }
  });

  test("an impossible scenario fails with the seeder's own message", async () => {
    await expect(
      seedGame({ scoring: "MP", play: "all", scenario: { withdraw: ["A1NS"] } }),
    ).rejects.toThrow(/--play all leaves none/);
  });
});
