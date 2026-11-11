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

/** The Stationary toggle group for one pair in a table's dialog. */
function stationaryToggle(page: Page, side: "NS" | "EW") {
  return page
    .getByRole("group", { name: "Stationary" })
    .nth(side === "NS" ? 0 : 1);
}

async function openTable(page: Page, gameId: string, table: number) {
  await gotoStable(page, `/game/${gameId}/manage/tables`);
  await page.getByRole("button", { name: `Manage table ${table}` }).click();
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

      // Mark it stationary now that the game is running. Its table's dialog
      // (the table it STARTED at) says the change applies from the next draw.
      await openTable(director, gameId, home.table);
      await expect(
        director.getByText(/Applies to rounds drawn from now on/).first(),
      ).toBeVisible({ timeout: 15000 });
      const toggle = stationaryToggle(director, home.side);
      await toggle.getByRole("button", { name: "Yes", exact: true }).click();
      await expect(
        toggle.getByRole("button", { name: "Yes", exact: true }),
      ).toHaveAttribute("aria-pressed", "true", { timeout: 15000 });

      // Round 2 was already drawn and played: it is a record, untouched.
      expect(roundSeating(gameId, 2)).toEqual(round2);

      // The choice survives a reload.
      await openTable(director, gameId, home.table);
      await expect(
        stationaryToggle(director, home.side).getByRole("button", {
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

  test("a stationary pair shows its marker and can be unmarked again", async ({
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
      // Mark the pair that started at table 2 North/South, then unmark it.
      await openTable(director, game.gameId, 2);
      const yes = () =>
        stationaryToggle(director, "NS").getByRole("button", {
          name: "Yes",
          exact: true,
        });
      await yes().click();
      await expect(yes()).toHaveAttribute("aria-pressed", "true", {
        timeout: 15000,
      });
      // The table card carries the amber marker while it is stationary.
      await director.getByRole("button", { name: "Done", exact: true }).click();
      await expect(director.getByText("Stationary").first()).toBeVisible();

      await openTable(director, game.gameId, 2);
      await stationaryToggle(director, "NS")
        .getByRole("button", { name: "No", exact: true })
        .click();
      await openTable(director, game.gameId, 2);
      await expect(
        stationaryToggle(director, "NS").getByRole("button", {
          name: "No",
          exact: true,
        }),
      ).toHaveAttribute("aria-pressed", "true", { timeout: 15000 });
    } finally {
      await closeDevices(director);
    }
  });
});
