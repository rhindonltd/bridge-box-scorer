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

  test("an impossible scenario fails with the seeder's own message", async () => {
    await expect(
      seedGame({ scoring: "MP", play: "all", scenario: { withdraw: ["A1NS"] } }),
    ).rejects.toThrow(/--play all leaves none/);
  });
});
