import { test, expect } from "@playwright/test";
import { closeDevices, openSeat, seedGame } from "../fixtures/seeded-game";
import { submitResultViaSocket } from "../fixtures/seat-secret";

/**
 * The player's personal Scorecard (pairs events): Menu → Scorecard opens a
 * page listing every board the pair has played with a total, a % / MP toggle,
 * live updates as a result is confirmed, and the header back arrow returns to
 * play.
 *
 * Seeded as a matchpoint Mitchell with round 1 played, except board 1 at table
 * 1 (A1NS v A1EW), which is held back so the test can confirm it and watch the
 * scorecard update.
 */
test.describe("Scorecard", () => {
  test("lists the pair's boards, toggles % / MP, updates live and goes back to play", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const game = await seedGame({
      scoring: "MP",
      rounds: 3,
      play: "round1",
      holdBack: ["1@1/1"],
      eventName: `Scorecard ${Date.now()}`,
    });
    const bpr = game.boardsPerRound;
    const page = await openSeat(browser, game, "A1NS");
    try {
      await page.getByRole("button", { name: "Menu" }).click();
      await page.getByRole("menuitem", { name: "Scorecard" }).click();
      await page.waitForURL(
        new RegExp(`/game/${game.gameId}/play/A1NS/scorecard$`),
        { timeout: 15000 },
      );

      // Round 1's boards except the held-back board 1, plus the Total row.
      const rows = page.getByTestId("scorecard-row");
      await expect(rows).toHaveCount(bpr, { timeout: 15000 });
      await expect(rows.last()).toContainText("Total");
      await expect(rows.first()).not.toContainText(/^1\b/);

      // Percentage first; MP shows "value/top".
      await expect(page.getByRole("button", { name: "%" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await page.getByRole("button", { name: "MP", exact: true }).click();
      await expect(rows.last()).toContainText("/");

      // Confirm the held-back board from both sides of table 1: it appears on
      // the open scorecard without a refresh.
      for (const seat of ["A1NS", "A1EW"]) {
        const res = await submitResultViaSocket({
          gameId: game.gameId,
          seat,
          token: game.seats[seat].token,
          roundNumber: 1,
          tableNumber: 1,
          boardNumber: 1,
          result: "3NTN=",
        });
        expect(res.success, `submit from ${seat}`).toBe(true);
      }
      await expect(rows).toHaveCount(bpr + 1, { timeout: 15000 });
      await expect(rows.first()).toContainText("1");

      // The header back arrow returns to play.
      await page.getByRole("button", { name: "Go back", exact: true }).click();
      await page.waitForURL(new RegExp(`/game/${game.gameId}/play/A1NS$`), {
        timeout: 15000,
      });
    } finally {
      await closeDevices(page);
    }
  });

  test("is not offered in a teams event", async ({ browser }) => {
    test.setTimeout(90_000);
    const game = await seedGame({
      scoring: "TEAMS_IMP_VP",
      play: "none",
      eventName: `Scorecard teams ${Date.now()}`,
    });
    const seat = Object.keys(game.seats)[0];
    const page = await openSeat(browser, game, seat);
    try {
      await page.getByRole("button", { name: "Menu" }).click();
      await expect(
        page.getByRole("menuitem", { name: "Handover" }),
      ).toBeVisible();
      await expect(
        page.getByRole("menuitem", { name: "Scorecard" }),
      ).toHaveCount(0);
    } finally {
      await closeDevices(page);
    }
  });
});
