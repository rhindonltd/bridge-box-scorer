import { test, expect, type Page } from "@playwright/test";

import {
  openDirectorTraveller,
  overrideRowToContract,
} from "../fixtures/director-override";
import {
  column,
  parseScore,
  readScoreTables,
  tableWithHeader,
} from "../fixtures/score-tables";
import { closeDevices, openDirector, seedGame } from "../fixtures/seeded-game";
import {
  confirmRound,
  drawNextRound,
  homeSeatOf,
} from "../fixtures/swiss-round";
import { gotoStable } from "./support";

/**
 * Swiss §3.5 mismatch review: Manage > Review Mismatches.
 *
 * A mismatch arises when a result is corrected AFTER the next round was drawn:
 * the draw was made on the old standings, so a pair may have met opponents
 * more than 5 VP away from the ones the corrected standings would have given.
 * The review screen lists those candidates; the director applies the §3.5.2
 * adjustment (only to the mismatched pair's VP for that round) or dismisses one
 * that wasn't a real mismatch.
 *
 * Seeded: a 3-table Swiss Pairs (matchpoints → VP) game with round 1 spread
 * (table 1 tops, table 3 floors). Round 2 is drawn on that order and scored as
 * all pass-outs (every match 10–10). Round 1 is then corrected the other way
 * round, so round 2 no longer matches the corrected draw.
 */

const TABLES = 3;
const BOARDS_PER_ROUND = 2;

/** Round 1: table 1 makes 6NT, table 2 3NT, table 3 1NT on both boards. */
const ROUND_ONE: Record<string, string> = {
  "1@1": "6NTN=",
  "2@1": "6NTN=",
  "1@2": "3NTN=",
  "2@2": "3NTN=",
  "1@3": "1NTN=",
  "2@3": "1NTN=",
};

/** The leaderboard's name cell for Swiss pair `n` (named after its home seat). */
function pairName(n: number): string {
  const { table, side } = homeSeatOf(`A${n}`, TABLES);
  const seat = `A${table}${side}`;
  return `P${seat} North P${seat} South`;
}

/** Round-2 VP for every pair, keyed by the leaderboard's name cell. */
async function roundTwoVp(page: Page, gameId: string) {
  await expect(async () => {
    await page
      .goto(`/game/${gameId}/display/leaderboard`, { waitUntil: "commit" })
      .catch(() => {});
    await expect(page).toHaveURL(/\/display\/leaderboard$/, { timeout: 2000 });
    await expect(page.getByTestId("leaderboard-row")).toHaveCount(
      2 * TABLES,
      { timeout: 5000 },
    );
  }).toPass({ timeout: 30000 });
  const table = tableWithHeader(await readScoreTables(page), "PAIR");
  const names = column(table, "PAIR");
  const vp = column(table, "2").map(parseScore);
  return Object.fromEntries(names.map((n, i) => [n, vp[i]]));
}

/** Correct both of a round-1 table's boards to `level`NT by North, making. */
async function correctRoundOneTable(
  page: Page,
  gameId: string,
  table: number,
  level: 1 | 6,
) {
  for (const board of [1, 2]) {
    await openDirectorTraveller(page, gameId, board);
    await overrideRowToContract(
      page,
      `traveller-row-1-${table}`,
      { level, suit: "NT", declarer: "N", result: { mode: "made", value: 0 } },
      { leadCardRequired: false },
    );
  }
}

/** The review screen's candidate cards. */
function candidateCards(page: Page) {
  return page
    .locator("div.rounded-xl.border-2")
    .filter({ hasText: /^Section A, round \d+, table \d+/ });
}

test.describe("Swiss mismatch review", () => {
  test("a correction after the draw flags mismatches; each ruling adjusts only its own pair, and the others stay listed", async ({
    browser,
  }) => {
    test.setTimeout(240_000);
    const game = await seedGame({
      scoring: "SWISS_PAIRS_MP",
      tables: TABLES,
      rounds: 4,
      boardsPerRound: BOARDS_PER_ROUND,
      play: "round1",
      leadCardRequired: false,
      outcomes: ROUND_ONE,
      eventName: `Swiss mismatch ${Date.now()}`,
    });
    const gameId = game.gameId;
    const director = await openDirector(browser, game);
    try {
      // Round 2 is drawn on the round-1 order, then scored: every match is a
      // pass-out, so every pair takes 10 VP from round 2.
      await drawNextRound(director, gameId);
      await confirmRound(gameId, 2, TABLES);

      // Before any correction the draw stands: nothing to review. The menu
      // offers the screen for a started Swiss game.
      await gotoStable(director, `/game/${gameId}/manage`);
      await director.getByRole("button", { name: "Review Mismatches" }).click();
      await director.waitForURL(new RegExp(`/game/${gameId}/manage/mismatches$`));
      await expect(director.getByText(/No mismatches to review/)).toBeVisible({
        timeout: 15000,
      });

      // Correct round 1 the other way round: table 1 now floors, table 3 tops.
      await correctRoundOneTable(director, gameId, 1, 1);
      await correctRoundOneTable(director, gameId, 3, 6);

      const before = await roundTwoVp(director, gameId);
      for (const vp of Object.values(before)) expect(vp).toBe(10);

      // Round 2 was drawn on the old order, so it is now flagged.
      await gotoStable(director, `/game/${gameId}/manage/mismatches`);
      const cards = candidateCards(director);
      await expect(cards.first()).toBeVisible({ timeout: 15000 });
      const count = await cards.count();
      expect(count).toBeGreaterThan(0);

      // Each candidate names the round, the pair, the opponent it met and the
      // one the corrected draw gives, with their VP and the gap (over 5). Take
      // one where the pair met a STRONGER opponent than it should have: that is
      // the case §3.5.2 compensates when it wasn't the pair's fault.
      const first = cards.filter({ hasText: "a stronger opponent" }).first();
      const text = (await first.innerText()).replace(/\s+/g, " ");
      const parsed =
        /Pair (\d+) played pair (\d+) \((\d+(?:\.\d+)?) VP\) but the corrected draw gives pair (\d+) \((\d+(?:\.\d+)?) VP\) — a (stronger|weaker) opponent by (\d+(?:\.\d+)?) VP/.exec(
          text,
        );
      expect(parsed, `unexpected card text: ${text}`).not.toBeNull();
      const [, pair, opponent, actualOppVp, , correctOppVp, , gap] = parsed!;
      expect(text).toMatch(/^Section A, round 2, table \d+/);
      expect(Number(gap)).toBeGreaterThan(5);
      expect(Number(gap)).toBeCloseTo(
        Math.abs(Number(actualOppVp) - Number(correctOppVp)),
      );
      expect(Number(actualOppVp)).toBeGreaterThan(Number(correctOppVp));

      // Apply it as not the pair's fault. §3.5.2: a pair that met a stronger
      // opponent through no fault of its own is compensated up to 5 + ¾ of its
      // actual round VP — 10 → 12.5.
      await first.getByRole("button", { name: "Apply — not their fault" }).click();
      await expect(cards).toHaveCount(count - 1, { timeout: 15000 });

      const mismatched = pairName(Number(pair));
      const afterOne = await roundTwoVp(director, gameId);
      expect(afterOne[mismatched]).toBe(12.5);
      // Only that pair's VP is touched: every other pair keeps its round 2.
      for (const [name, vp] of Object.entries(afterOne)) {
        if (name !== mismatched) expect(vp).toBe(10);
      }

      // Reopening the review lists every other candidate still — including
      // the ruled pair's own opponent, which met the wrong opponent too.
      await gotoStable(director, `/game/${gameId}/manage/mismatches`);
      await expect(cards).toHaveCount(count - 1, { timeout: 15000 });
      await expect(
        cards.filter({ hasText: new RegExp(`Pair ${pair} played pair`) }),
      ).toHaveCount(0);
      const opponentCard = cards.filter({
        hasText: new RegExp(`Pair ${opponent} played pair ${pair} \\(`),
      });
      await expect(opponentCard).toHaveCount(1);
      await expect(opponentCard).toContainText("a weaker opponent");

      // Rule the opponent too, as its own fault. §3.5.2: a pair that met a
      // weaker opponent through its own fault is docked a quarter of its VP
      // above 5 — 10 → 8.75, rounded up in its favour to 9. The first pair's
      // ruling stands.
      await opponentCard
        .getByRole("button", { name: "Apply — their own fault" })
        .click();
      await expect(cards).toHaveCount(count - 2, { timeout: 15000 });
      const afterBoth = await roundTwoVp(director, gameId);
      const opponentName = pairName(Number(opponent));
      expect(afterBoth[mismatched]).toBe(12.5);
      expect(afterBoth[opponentName]).toBe(9);
      for (const [name, vp] of Object.entries(afterBoth)) {
        if (name !== mismatched && name !== opponentName) expect(vp).toBe(10);
      }
    } finally {
      await closeDevices(director);
    }
  });

  test("dismissing a candidate as not a mismatch changes no scores", async ({
    browser,
  }) => {
    test.setTimeout(240_000);
    const game = await seedGame({
      scoring: "SWISS_PAIRS_MP",
      tables: TABLES,
      rounds: 4,
      boardsPerRound: BOARDS_PER_ROUND,
      play: "round1",
      leadCardRequired: false,
      outcomes: ROUND_ONE,
      eventName: `Swiss mismatch dismiss ${Date.now()}`,
    });
    const gameId = game.gameId;
    const director = await openDirector(browser, game);
    try {
      await drawNextRound(director, gameId);
      await confirmRound(gameId, 2, TABLES);
      await correctRoundOneTable(director, gameId, 1, 1);
      await correctRoundOneTable(director, gameId, 3, 6);
      const before = await roundTwoVp(director, gameId);

      await gotoStable(director, `/game/${gameId}/manage/mismatches`);
      const cards = candidateCards(director);
      await expect(cards.first()).toBeVisible({ timeout: 15000 });
      const count = await cards.count();

      await cards
        .first()
        .getByRole("button", { name: "Not a mismatch" })
        .click();
      await expect(cards).toHaveCount(count - 1);

      // Dismissing records no ruling: the standings are exactly as before.
      expect(await roundTwoVp(director, gameId)).toEqual(before);
    } finally {
      await closeDevices(director);
    }
  });
});
