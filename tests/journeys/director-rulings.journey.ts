import { test, expect, type Page } from "@playwright/test";

import { openDirectorTraveller } from "../fixtures/director-override";
import {
  applyRuling,
  hubChoices,
  openHub,
} from "../fixtures/director-rulings";
import {
  parseScore,
  readScoreTables,
  tableWithHeader,
} from "../fixtures/score-tables";
import {
  closeDevices,
  openDirector,
  seedGame,
  type SeedGameOptions,
} from "../fixtures/seeded-game";

/**
 * Director rulings beyond a plain score correction: cancel / foul a board,
 * remove a board from a teams match, and void a whole teams or Swiss-pairs
 * match. (Overriding a result to a contract or an adjusted score is covered in
 * director-override.)
 *
 * Every game is seeded complete, so a ruling always acts on a board that was
 * really played. The hub is the director's one entry point, so each game type
 * is also checked for exactly the rulings it should offer.
 *
 * Teams figures follow the White Book: a seating void gives each team 40% of the
 * 20 VP (8), or 60% (12) when the TD was at fault (§3.3.6.1); a removed board is
 * worth 3 IMPs to the side not at fault (§3.3.7). The IMP-to-VP scale is covered
 * in scoring-teams, so here only the VP the ruling moves is asserted.
 */

const TEAMS_GAME = {
  scoring: "TEAMS_IMP_VP",
  tables: 4,
  rounds: 3,
  boardsPerRound: 2,
  play: "all",
} satisfies SeedGameOptions;

/**
 * Open the room-display leaderboard and wait for its rows. A saved ruling ends
 * on the manage menu, whose own redirects can still be landing; retry until the
 * leaderboard is what's actually on screen.
 */
async function openLeaderboard(page: Page, gameId: string): Promise<void> {
  await expect(async () => {
    await page
      .goto(`/game/${gameId}/display/leaderboard`, { waitUntil: "commit" })
      .catch(() => {});
    await expect(page).toHaveURL(/\/display\/leaderboard$/, { timeout: 2000 });
    await expect(page.getByTestId("leaderboard-row").first()).toBeVisible({
      timeout: 5000,
    });
  }).toPass({ timeout: 30000 });
}

/** Read the leaderboard's team table as `{ team: { total, rounds[] } }`. */
async function teamVp(
  page: Page,
  gameId: string,
): Promise<Record<string, { total: number; rounds: number[] }>> {
  await openLeaderboard(page, gameId);
  const table = tableWithHeader(await readScoreTables(page), "TEAM");
  const out: Record<string, { total: number; rounds: number[] }> = {};
  for (const row of table.rows) {
    const [, team, total, ...rounds] = row;
    out[team] = { total: parseScore(total), rounds: rounds.map(parseScore) };
  }
  return out;
}

test.describe("Director rulings", () => {
  test("cancel / foul board assigns the chosen average, and a plain pairs game offers no teams or Swiss rulings", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const game = await seedGame({
      scoring: "MP",
      tables: 2,
      movement: "recommended",
      play: "all",
      eventName: `Rulings cancel ${Date.now()}`,
    });
    const director = await openDirector(browser, game);
    try {
      await openHub(director, game.gameId, 1, "traveller-row-1-1");
      expect(await hubChoices(director)).toEqual([
        "Enter Contract",
        "Adjusted Score",
        "Weighted Score",
        "Cancel / Foul Board",
      ]);

      await applyRuling(
        director,
        game.gameId,
        1,
        "traveller-row-1-1",
        "Cancel / Foul Board",
        /\(60\/40\)/,
      );

      // The cancelled row now reads as the adjusted score; the other table's
      // row for the same board is untouched.
      await openDirectorTraveller(director, game.gameId, 1);
      await expect(director.getByTestId("traveller-row-1-1")).toContainText(
        /Adj\s*60%\/40%/,
      );
      await expect(director.getByTestId("traveller-row-1-2")).not.toContainText(
        "Adj",
      );
    } finally {
      await closeDevices(director);
    }
  });

  test("Teams: the hub offers the teams rulings, and removing a board moves 3 IMPs to the side not at fault", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const game = await seedGame({
      ...TEAMS_GAME,
      eventName: `Rulings remove ${Date.now()}`,
    });
    const director = await openDirector(browser, game);
    try {
      await openHub(director, game.gameId, 1, "traveller-row-1-1");
      expect(await hubChoices(director)).toEqual([
        "Enter Contract",
        "Adjusted Score",
        "Weighted Score",
        "Cancel / Foul Board",
        "Board Not Played (Teams)",
        "Void Match (Teams)",
      ]);

      // Round 1 plays team 1 against team 4: team 4 won the match, 17 VP to 3.
      const before = await teamVp(director, game.gameId);
      expect(before["Team A4NS"].rounds[0]).toBe(17);
      expect(before["Team A1NS"].rounds[0]).toBe(3);

      // Board 1 could not be played and the opponents (team 4) were at fault:
      // team 1 gets +3 IMPs on it. Team 4's margin falls from 14 to 10 IMPs,
      // which is one VP less for team 4 and one more for team 1.
      await applyRuling(
        director,
        game.gameId,
        1,
        "traveller-row-1-1",
        "Board Not Played (Teams)",
        /Opponents \(EW\) at fault/,
      );
      const after = await teamVp(director, game.gameId);
      expect(after["Team A4NS"].rounds[0]).toBe(16);
      expect(after["Team A1NS"].rounds[0]).toBe(4);
      expect(after["Team A4NS"].total).toBe(before["Team A4NS"].total - 1);
      expect(after["Team A1NS"].total).toBe(before["Team A1NS"].total + 1);

      // Only that match moved; the other round 1 match is as before.
      expect(after["Team A2NS"].rounds).toEqual(before["Team A2NS"].rounds);
      expect(after["Team A3NS"].rounds).toEqual(before["Team A3NS"].rounds);
    } finally {
      await closeDevices(director);
    }
  });

  test("Teams: voiding a match credits each team a flat 40%, or 60% when the TD was at fault", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const game = await seedGame({
      ...TEAMS_GAME,
      eventName: `Rulings void ${Date.now()}`,
    });
    const director = await openDirector(browser, game);
    try {
      const before = await teamVp(director, game.gameId);

      // Round 1, teams 1 v 4: incorrect seating, can't be replayed.
      await applyRuling(
        director,
        game.gameId,
        1,
        "traveller-row-1-1",
        "Void Match (Teams)",
        /Incorrect seating \/ cannot replay/,
      );
      // Round 2, teams 1 v 3: incorrect seating and the TD's fault. Board 3 is
      // the first board of round 2.
      await applyRuling(
        director,
        game.gameId,
        3,
        "traveller-row-2-1",
        "Void Match (Teams)",
        /TD at fault/,
      );

      const after = await teamVp(director, game.gameId);
      // 40% of 20 VP each in round 1, 60% each in round 2.
      expect(after["Team A1NS"].rounds.slice(0, 2)).toEqual([8, 12]);
      expect(after["Team A4NS"].rounds[0]).toBe(8);
      expect(after["Team A3NS"].rounds[1]).toBe(12);

      // Voiding changes only the voided matches: the round 3 results stand and
      // round 2's other match (teams 2 v 4) is untouched.
      for (const team of ["Team A1NS", "Team A3NS", "Team A4NS"]) {
        expect(after[team].rounds[2]).toBe(before[team].rounds[2]);
      }
      expect(after["Team A2NS"].rounds).toEqual(before["Team A2NS"].rounds);
      expect(after["Team A4NS"].rounds[1]).toBe(before["Team A4NS"].rounds[1]);
    } finally {
      await closeDevices(director);
    }
  });

  test("Swiss pairs: voiding a match removes it from the field and credits the pairs by fault", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const game = await seedGame({
      ...TEAMS_GAME,
      scoring: "SWISS_PAIRS_MP",
      eventName: `Rulings swiss void ${Date.now()}`,
    });
    const director = await openDirector(browser, game);

    /** Round 1 VP by pair, read from the leaderboard's pair table. */
    const roundOneVp = async (): Promise<Record<string, number>> => {
      await openLeaderboard(director, game.gameId);
      const table = tableWithHeader(await readScoreTables(director), "PAIR");
      const out: Record<string, number> = {};
      for (const row of table.rows) out[row[1]] = parseScore(row[2]);
      return out;
    };

    try {
      await openHub(director, game.gameId, 1, "traveller-row-1-1");
      expect(await hubChoices(director)).toEqual([
        "Enter Contract",
        "Adjusted Score",
        "Weighted Score",
        "Cancel / Foul Board",
        "Void Match (Pairs)",
        "Mismatch (Swiss)",
      ]);

      const before = await roundOneVp();
      const ns = "PA1NS North PA1NS South";
      const ew = "PA1EW North PA1EW South";
      // The scores handed out are 20 VP a match, whatever the result.
      expect(before[ns] + before[ew]).toBe(20);

      // Table 1's opponents (EW) were at fault: this table is compensated, the
      // opponents are penalised.
      await applyRuling(
        director,
        game.gameId,
        1,
        "traveller-row-1-1",
        "Void Match (Pairs)",
        /Opponents \(EW\) at fault/,
      );
      const after = await roundOneVp();
      expect(after[ns]).toBeGreaterThan(10);
      expect(after[ew]).toBeLessThan(10);
      expect(after[ns] + after[ew]).toBe(20);

      // The voided match no longer counts in the field the others are scored
      // against, so the whole round still hands out 20 VP a match.
      const total = Object.values(after).reduce((a, b) => a + b, 0);
      expect(total).toBe(80);
    } finally {
      await closeDevices(director);
    }
  });

  test("Swiss teams: the hub offers the teams rulings and the Swiss mismatch, but not the pairs void", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const game = await seedGame({
      ...TEAMS_GAME,
      scoring: "SWISS_TEAMS",
      eventName: `Rulings swiss teams ${Date.now()}`,
    });
    const director = await openDirector(browser, game);
    try {
      await openHub(director, game.gameId, 1, "traveller-row-1-1");
      expect(await hubChoices(director)).toEqual([
        "Enter Contract",
        "Adjusted Score",
        "Weighted Score",
        "Cancel / Foul Board",
        "Board Not Played (Teams)",
        "Void Match (Teams)",
        "Mismatch (Swiss)",
      ]);
    } finally {
      await closeDevices(director);
    }
  });
});
