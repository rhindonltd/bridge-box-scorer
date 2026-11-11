import { test, expect, type Browser } from "@playwright/test";
import {
  column,
  expectRankingConsistent,
  mean,
  parseScore,
  readScoreTables,
  type ScoreTableData,
} from "../fixtures/score-tables";
import { seedGame, type SeedGameOptions } from "../fixtures/seeded-game";
import { newParticipant } from "./support";

/**
 * Scoring invariants: properties that must hold for ANY set of results, so they
 * need no hand calculation. Each game is seeded with the seeder's default spread
 * of results (not hand-picked ones) and every figure on the leaderboard is
 * checked against the conservation rule for that scoring method. They sit
 * alongside the pinned-figure journeys (scoring-ximp / -teams / -neuberg): those
 * prove the exact numbers; these would catch a regression that only shows on
 * results nobody thought to pin.
 *
 * Swiss has its own journeys and is not covered here.
 */
async function leaderboard(
  browser: Browser,
  options: SeedGameOptions,
  rows: number,
): Promise<ScoreTableData[]> {
  const game = await seedGame({
    play: "all",
    eventName: `Invariants ${options.scoring} ${Date.now()}`,
    ...options,
  });
  const page = await newParticipant(browser);
  try {
    await page.goto(`/game/${game.gameId}/display/leaderboard`);
    await expect(page.getByTestId("leaderboard-row")).toHaveCount(rows, {
      timeout: 20000,
    });
    return await readScoreTables(page);
  } finally {
    await page.context().close();
  }
}

test.describe("Pairs matchpoints", () => {
  for (const [label, options, rows] of [
    ["a 3-table Mitchell", { scoring: "MP", tables: 3, rounds: 3 }, 6],
    ["a 5-table Mitchell", { scoring: "MP", tables: 5, rounds: 5 }, 10],
  ] as const) {
    test(`${label}: shares sum to 50%, in range, ranked consistently`, async ({
      browser,
    }) => {
      test.setTimeout(150_000);
      const tables = await leaderboard(browser, options, rows);
      const lists = tables.filter((t) => t.headers.includes("%"));
      expect(lists).toHaveLength(2); // North/South and East/West
      const all: number[] = [];
      for (const list of lists) {
        expectRankingConsistent(list, "%");
        const pct = column(list, "%").map(parseScore);
        for (const p of pct) {
          expect(p).toBeGreaterThanOrEqual(0);
          expect(p).toBeLessThanOrEqual(100);
        }
        all.push(...pct);
      }
      // Every board hands out its whole top between the two sides, so with
      // equal boards for everyone the average share is exactly 50%.
      expect(all).toHaveLength(rows);
      expect(Math.abs(mean(all) - 50)).toBeLessThan(0.02);
    });
  }
});

test.describe("Pairs Cross-IMPs", () => {
  for (const [label, options, rows] of [
    ["a 3-table Mitchell", { scoring: "XIMP", tables: 3, rounds: 3 }, 6],
    ["a 5-table Mitchell", { scoring: "XIMP", tables: 5, rounds: 5 }, 10],
  ] as const) {
    test(`${label}: cross-IMPs cancel out, ranked consistently`, async ({
      browser,
    }) => {
      test.setTimeout(150_000);
      const tables = await leaderboard(browser, options, rows);
      const lists = tables.filter((t) => t.headers.includes("X-IMP"));
      expect(lists).toHaveLength(2);
      const all: number[] = [];
      for (const list of lists) {
        expectRankingConsistent(list, "X-IMP");
        all.push(...column(list, "X-IMP").map(parseScore));
      }
      // What one side gains the other loses on every board, so the average
      // across all pairs (equal boards each) is zero, within display rounding.
      expect(all).toHaveLength(rows);
      expect(Math.abs(mean(all))).toBeLessThan(0.05);
    });
  }
});

test.describe("Teams", () => {
  const TEAMS = { tables: 4, rounds: 3, boardsPerRound: 2 };

  test("IMP (Aggregate): net IMPs cancel out and rounds add to the total", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const [table] = await leaderboard(
      browser,
      { ...TEAMS, scoring: "TEAMS_IMP_AGG" },
      4,
    );
    expectRankingConsistent(table, "TOTAL");
    const totals = column(table, "TOTAL").map(parseScore);
    expect(totals.reduce((a, b) => a + b, 0)).toBe(0);
    // Each team's total is the sum of its three rounds.
    table.rows.forEach((row, i) => {
      const rounds = row.slice(3).map(parseScore);
      expect(totals[i]).toBe(rounds.reduce((a, b) => a + b, 0));
    });
    // In each round the two matches are zero-sum.
    for (const round of ["1", "2", "3"]) {
      const sum = column(table, round)
        .map(parseScore)
        .reduce((a, b) => a + b, 0);
      expect(sum).toBe(0);
    }
  });

  for (const scoring of ["TEAMS_BAM", "TEAMS_PAB"] as const) {
    test(`${scoring}: boards-won shares average 50% and rank consistently`, async ({
      browser,
    }) => {
      test.setTimeout(120_000);
      const [table] = await leaderboard(browser, { ...TEAMS, scoring }, 4);
      expectRankingConsistent(table, "TOTAL");
      const shares = column(table, "TOTAL").map(parseScore);
      for (const s of shares) {
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(100);
      }
      // Every board is won by one team or shared, so the average is 50%.
      expect(Math.abs(mean(shares) - 50)).toBeLessThan(0.02);
    });
  }

  test("IMP (Victory Points): every match shares out exactly 20 VP", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const [table] = await leaderboard(
      browser,
      { ...TEAMS, scoring: "TEAMS_IMP_VP" },
      4,
    );
    expectRankingConsistent(table, "TOTAL");
    // Two matches a round, 20 VP each.
    for (const round of ["1", "2", "3"]) {
      const sum = column(table, round)
        .map(parseScore)
        .reduce((a, b) => a + b, 0);
      expect(sum).toBe(40);
    }
    const totals = column(table, "TOTAL").map(parseScore);
    table.rows.forEach((row, i) => {
      const rounds = row.slice(3).map(parseScore);
      expect(totals[i]).toBeCloseTo(
        rounds.reduce((a, b) => a + b, 0),
        2,
      );
      for (const vp of rounds) {
        expect(vp).toBeGreaterThanOrEqual(0);
        expect(vp).toBeLessThanOrEqual(20);
      }
    });
  });
});
