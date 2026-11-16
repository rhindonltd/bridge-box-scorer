import { test, expect, type Page } from "@playwright/test";
import { closeDevices, openDirector, seedGame } from "../fixtures/seeded-game";
import {
  confirmRound,
  drawNextRound,
  homeSeatOf,
  roundSeating,
} from "../fixtures/swiss-round";
import { gotoStable } from "./support";

/**
 * Stationary pairs in Swiss Pairs.
 *
 * A stationary pair keeps its home table and direction (its opponents come to
 * it). The director can mark or unmark a pair at ANY time: before the start it
 * shapes the draw from round 2; once play is under way it applies to the rounds
 * drawn from then on. Rounds already drawn are a record of what happened and
 * never change.
 *
 * Seeded: a started 4-table Swiss Pairs game with round 1 played. Board rows
 * name each pair by its home seat or stable number (see homeSeatOf), wherever it
 * is sitting, so placement is read from the database.
 */
const TABLES = 4;

/** The pair number in a board id ("A5" → "5"), as the Pairs roster headings show it. */
function pairNumber(pairId: string): string {
  return pairId.match(/\d+$/)![0];
}

/** One pair's card on the Pairs roster, found by its pair-number heading. */
function pairCard(page: Page, number: string) {
  return page.getByRole("listitem").filter({
    has: page.getByRole("heading", {
      level: 3,
      name: new RegExp(`^${number}$`),
    }),
  });
}

/** Open the Pairs roster and expand one pair's card. */
async function openPair(page: Page, gameId: string, number: string) {
  await gotoStable(page, `/game/${gameId}/manage/pairs`);
  await pairCard(page, number).getByRole("button").first().click();
}

/** The Stationary toggle group on a pair's expanded card. */
function stationaryToggle(page: Page, number: string) {
  return pairCard(page, number).getByRole("group", { name: "Stationary" });
}

/** Every (pair, table, side) in a round. */
function placements(rows: ReturnType<typeof roundSeating>) {
  return rows.flatMap((r) => [
    { pair: r.ns, table: r.tableNumber, side: "NS" as const },
    { pair: r.ew, table: r.tableNumber, side: "EW" as const },
  ]);
}

test.describe("Stationary pairs in Swiss Pairs", () => {
  test("marking a pair mid-event applies to the next draw and leaves earlier rounds as they were", async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const game = await seedGame({
      scoring: "SWISS_PAIRS_MP",
      tables: TABLES,
      rounds: 4,
      play: "round1",
      eventName: `Swiss Stationary ${Date.now()}`,
    });
    const gameId = game.gameId;
    const director = await openDirector(browser, game);
    try {
      // Round 2 is drawn with nothing marked.
      await drawNextRound(director, gameId);
      const round2 = roundSeating(gameId, 2);
      expect(round2).toHaveLength(TABLES);

      // Pick a pair that the draw moved away from its home seat.
      const moved = placements(round2).find((p) => {
        const home = homeSeatOf(p.pair, TABLES);
        return home.table !== p.table || home.side !== p.side;
      });
      expect(moved, "round 2 should move at least one pair").toBeDefined();
      const home = homeSeatOf(moved!.pair, TABLES);

      // Mark it stationary now that the game is running. Its card on the Pairs
      // roster says the change applies from the next draw.
      const number = pairNumber(moved!.pair);
      await openPair(director, gameId, number);
      await expect(
        pairCard(director, number).getByText(
          /Applies to rounds drawn from now on/,
        ),
      ).toBeVisible({ timeout: 15000 });
      const toggle = stationaryToggle(director, number);
      await toggle.getByRole("button", { name: "Yes", exact: true }).click();
      await expect(
        toggle.getByRole("button", { name: "Yes", exact: true }),
      ).toHaveAttribute("aria-pressed", "true", { timeout: 15000 });

      // Round 2 was already drawn and played: it is a record, untouched.
      expect(roundSeating(gameId, 2)).toEqual(round2);

      // The choice survives a reload.
      await openPair(director, gameId, number);
      await expect(
        stationaryToggle(director, number).getByRole("button", {
          name: "Yes",
          exact: true,
        }),
      ).toHaveAttribute("aria-pressed", "true", { timeout: 15000 });

      // Score round 2 and draw round 3: the marked pair is back at its home
      // seat, with its opponent brought to it.
      await confirmRound(gameId, 2, TABLES);
      await drawNextRound(director, gameId);
      const round3 = placements(roundSeating(gameId, 3));
      const seatOf = round3.find((p) => p.pair === moved!.pair)!;
      expect({ table: seatOf.table, side: seatOf.side }).toEqual(home);

      // Both earlier rounds are still exactly as they were drawn.
      expect(roundSeating(gameId, 2)).toEqual(round2);
    } finally {
      await closeDevices(director);
    }
  });

  test("a stationary pair stays marked after a reload and can be unmarked again", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const game = await seedGame({
      scoring: "SWISS_PAIRS_MP",
      tables: TABLES,
      rounds: 4,
      play: "round1",
      eventName: `Swiss Unmark ${Date.now()}`,
    });
    const director = await openDirector(browser, game);
    try {
      // Mark the pair that started at table 2 North/South (pair 2), then
      // unmark it.
      await openPair(director, game.gameId, "2");
      const yes = () =>
        stationaryToggle(director, "2").getByRole("button", {
          name: "Yes",
          exact: true,
        });
      await yes().click();
      await expect(yes()).toHaveAttribute("aria-pressed", "true", {
        timeout: 15000,
      });

      // It is still marked after a reload.
      await openPair(director, game.gameId, "2");
      await expect(yes()).toHaveAttribute("aria-pressed", "true", {
        timeout: 15000,
      });

      await stationaryToggle(director, "2")
        .getByRole("button", { name: "No", exact: true })
        .click();
      await openPair(director, game.gameId, "2");
      await expect(
        stationaryToggle(director, "2").getByRole("button", {
          name: "No",
          exact: true,
        }),
      ).toHaveAttribute("aria-pressed", "true", { timeout: 15000 });
    } finally {
      await closeDevices(director);
    }
  });
});
