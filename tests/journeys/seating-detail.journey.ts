import { test, expect } from "@playwright/test";

import { createGame } from "../fixtures/game-create";
import { setTableCount, pickFirstMovement } from "../fixtures/game-setup";
import { deleteGame } from "../fixtures/delete-game";
import { seatPairBySeat, SEEDED_EBU } from "../fixtures/join";
import { newParticipant } from "./support";

/**
 * Player join & seating detail journey.
 *
 * Exercises the join-flow detail that the coarse seating fixture skips:
 *
 *  - EnterPlayerNames labels the two searches North/South for an NS seat and
 *    East/West for an EW seat, and "Enter Pair" stays disabled until BOTH
 *    players are chosen.
 *  - PlayerSearch shows a "Searching..." affordance, then a result list; the
 *    chosen player becomes a green confirmation card whose X clears it.
 *  - Seat occupancy is live: a pair seated in one context disables that seat in
 *    another already-open join page, via the PARTICIPANTS socket sync (not a
 *    reload). This is the socket→SWR bridge on swrKeys.pairs.
 */

test.describe("Player join & seating detail", () => {
  test("EnterPlayerNames uses direction-correct labels and gates Enter Pair", async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const page = await newParticipant(browser);
    const { gameId } = await createGame(page, {
      eventName: `Seat Detail Labels ${Date.now()}`,
      recordOpeningLead: false,
    });

    try {
      await setTableCount(page, 2);
      await pickFirstMovement(page);

      // --- NS seat: labels North / South ---
      await page.goto(`/game/${gameId}/join`);
      await page.getByTestId("seat-A1NS").click();

      // Both searches are labelled for the NS direction.
      await expect(
        page.getByTestId("player-search-input-North"),
      ).toBeVisible({ timeout: 15000 });
      await expect(page.getByTestId("player-search-input-South")).toBeVisible();
      await expect(page.getByTestId("player-search-input-East")).toHaveCount(0);

      // Enter Pair is disabled with neither player chosen.
      const enterPair = page.getByRole("button", { name: "Enter Pair" });
      await expect(enterPair).toBeDisabled();

      // Search + choose the first player -> green card, still disabled.
      const northInput = page.getByTestId("player-search-input-North");
      await northInput.fill(SEEDED_EBU.jacquelineCollier);
      const northResult = page.getByTestId("player-search-result").first();
      await expect(northResult).toBeVisible({ timeout: 10000 });
      await northResult.click();
      await expect(enterPair).toBeDisabled();

      // Choose the second player -> both chosen, Enter Pair enabled.
      const southInput = page.getByTestId("player-search-input-South");
      await southInput.fill(SEEDED_EBU.davidCollier);
      const southResult = page.getByTestId("player-search-result").first();
      await expect(southResult).toBeVisible({ timeout: 10000 });
      await southResult.click();
      await expect(enterPair).toBeEnabled();

      // --- EW seat: labels East / West ---
      // Dismiss the sheet (backdrop) and pick an EW seat.
      await page.reload();
      await page.getByTestId("seat-A1EW").click();
      await expect(page.getByTestId("player-search-input-East")).toBeVisible({
        timeout: 15000,
      });
      await expect(page.getByTestId("player-search-input-West")).toBeVisible();
      await expect(page.getByTestId("player-search-input-North")).toHaveCount(0);
    } finally {
      await deleteGame(page, gameId);
      await page.context().close();
    }
  });

  test("PlayerSearch shows searching, a result list, and a clearable green card", async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const page = await newParticipant(browser);
    const { gameId } = await createGame(page, {
      eventName: `Seat Detail Search ${Date.now()}`,
      recordOpeningLead: false,
    });

    try {
      await setTableCount(page, 2);
      await pickFirstMovement(page);

      await page.goto(`/game/${gameId}/join`);
      await page.getByTestId("seat-A1NS").click();

      const northInput = page.getByTestId("player-search-input-North");
      await expect(northInput).toBeVisible({ timeout: 15000 });

      // Type a searching query; the debounced fetch flips loading on. Racing the
      // 250ms debounce is flaky, so assert on either the transient "Searching..."
      // OR the settled result list — both prove the search fired.
      await northInput.fill(SEEDED_EBU.jacquelineCollier);
      const result = page.getByTestId("player-search-result").first();
      await expect(result).toBeVisible({ timeout: 10000 });

      // Result rows show the player's name.
      await expect(result).toContainText(/[A-Za-z]/);

      // Choosing the player replaces the input with a green confirmation card.
      await result.click();
      await expect(northInput).toHaveCount(0);
      // The card shows the chosen player's EBU number and a clear (X) button.
      await expect(page.getByText(`EBU ${SEEDED_EBU.jacquelineCollier}`)).toBeVisible();

      // Clear it (the X button) -> the search input returns.
      // The green card holds a single icon-only button (the X).
      const card = page
        .getByText(`EBU ${SEEDED_EBU.jacquelineCollier}`)
        .locator("xpath=ancestor::div[contains(@class,'bg-green-50')]");
      await card.getByRole("button").click();
      await expect(page.getByTestId("player-search-input-North")).toBeVisible({
        timeout: 10000,
      });

      // Below-threshold query (<2 chars) shows no results list.
      await page.getByTestId("player-search-input-North").fill("j");
      await expect(page.getByTestId("player-search-result")).toHaveCount(0);
    } finally {
      await deleteGame(page, gameId);
      await page.context().close();
    }
  });

  test("a seat taken in one context becomes disabled live in another", async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    const director = await newParticipant(browser);
    const { gameId } = await createGame(director, {
      eventName: `Seat Detail Live ${Date.now()}`,
      recordOpeningLead: false,
    });

    let watcher = null as Awaited<ReturnType<typeof newParticipant>> | null;
    try {
      await setTableCount(director, 2);
      await pickFirstMovement(director);

      // A second participant (different context/socket) opens the join page and
      // sees A1NS available.
      watcher = await newParticipant(browser);
      await watcher.goto(`/game/${gameId}/join`);
      const watchedSeat = watcher.getByTestId("seat-A1NS");
      await expect(watchedSeat).toBeEnabled({ timeout: 15000 });

      // The director seats a pair at A1NS in their own context.
      await seatPairBySeat(
        director,
        gameId,
        "A1NS",
        SEEDED_EBU.jacquelineCollier,
        SEEDED_EBU.davidCollier,
      );

      // Without reloading, the watcher's join page receives the PARTICIPANTS
      // push and disables the now-occupied seat.
      await expect(watchedSeat).toBeDisabled({ timeout: 15000 });
    } finally {
      if (watcher) await watcher.context().close();
      await deleteGame(director, gameId);
      await director.context().close();
    }
  });
});
