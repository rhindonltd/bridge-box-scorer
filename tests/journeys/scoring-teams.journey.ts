import { test, expect, type Browser, type Page } from "@playwright/test";
import { createGame } from "../fixtures/game-create";
import { deleteGame } from "../fixtures/delete-game";
import { openDirectorTraveller } from "../fixtures/director-override";
import {
  THREE_TEAM_MATCHES,
  teamMatchOutcomes,
  type TeamMatch,
} from "../fixtures/scoring-scenarios";
import {
  column,
  parseScore,
  readScoreTables,
  scoresByName,
  tableWithHeader,
  type ScoreTableData,
} from "../fixtures/score-tables";
import {
  closeDevices,
  openDirector,
  seedGame,
  type SeedGameOptions,
} from "../fixtures/seeded-game";
import { gotoStable, newParticipant } from "./support";

/**
 * Teams scoring through the real screens: IMP (Victory Points), IMP (Aggregate),
 * Board-a-Match and Point-a-Board.
 *
 * The same hand-built match results (fixtures/scoring-scenarios.ts, with every
 * expected figure worked out there) are seeded into one game per method, so a
 * single calculation gives four expectations. The maths itself is unit tested;
 * what these prove is the wiring: the chosen method reaches the leaderboard,
 * the right columns and number format appear, the order and ties are right, and
 * the board detail agrees with the standings.
 */

/** A 3-team American Whist at 2 boards a round (every round is played). */
const THREE_TEAMS = {
  tables: 3,
  boardsPerRound: 2,
  play: "all",
  outcomes: teamMatchOutcomes(THREE_TEAM_MATCHES),
} satisfies SeedGameOptions;

const TEAM = (n: number) => `Team A${n}NS`;

/** Seed a finished game and read its room-display leaderboard table. */
async function leaderboardOf(
  browser: Browser,
  options: SeedGameOptions,
  rows: number,
): Promise<{
  table: ScoreTableData;
  gameId: string;
  director: Page;
}> {
  const game = await seedGame({
    eventName: `Scoring ${options.scoring} ${Date.now()}`,
    ...options,
  });
  const director = await openDirector(
    browser,
    game,
    `/game/${game.gameId}/display/leaderboard`,
  );
  await expect(director.getByTestId("leaderboard-row")).toHaveCount(rows, {
    timeout: 20000,
  });
  const tables = await readScoreTables(director);
  return {
    table: tableWithHeader(tables, "TEAM"),
    gameId: game.gameId,
    director,
  };
}

/** A team's per-match figures, in match-number columns ("" when not played). */
function perMatch(table: ScoreTableData, team: string): number[] {
  return table.rows
    .find((r) => r[1] === team)!
    .slice(3)
    .map(parseScore);
}

test.describe("Teams scoring", () => {
  test("IMP (Aggregate): net IMPs per match and in total, best first", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const { table, director } = await leaderboardOf(
      browser,
      { ...THREE_TEAMS, scoring: "TEAMS_IMP_AGG" },
      3,
    );
    try {
      // Total and one column per match (numbered by board set); each team
      // plays two of the three matches.
      expect(table.headers).toEqual(["RANK", "TEAM", "TOTAL", "1", "2", "3"]);
      expect(perMatch(table, TEAM(1))).toEqual([0, -21, NaN]);
      expect(perMatch(table, TEAM(2))).toEqual([NaN, 21, -1]);
      expect(perMatch(table, TEAM(3))).toEqual([0, NaN, 1]);
      expect(scoresByName(table, "TEAM", "TOTAL")).toEqual({
        [TEAM(1)]: -21,
        [TEAM(2)]: 20,
        [TEAM(3)]: 1,
      });
      // Best first, and the IMPs conserve: nobody gains without someone else
      // losing.
      expect(column(table, "TEAM")).toEqual([TEAM(2), TEAM(3), TEAM(1)]);
      expect(column(table, "RANK")).toEqual(["1", "2", "3"]);
      const totals = column(table, "TOTAL").map(parseScore);
      expect(totals.reduce((a, b) => a + b, 0)).toBe(0);
    } finally {
      await closeDevices(director);
    }
  });

  test("Board-a-Match: boards won as a percentage, with a shared first place", async ({
    browser,
    request,
  }) => {
    test.setTimeout(120_000);
    const { table, gameId, director } = await leaderboardOf(
      browser,
      { ...THREE_TEAMS, scoring: "TEAMS_BAM" },
      3,
    );
    try {
      expect(table.headers).toEqual(["RANK", "TEAM", "TOTAL"]);
      // Boards won out of 4: T2 2.5, T3 2.5, T1 1.
      const pct = scoresByName(table, "TEAM", "TOTAL");
      expect(pct[TEAM(2)]).toBeCloseTo(62.5, 2);
      expect(pct[TEAM(3)]).toBeCloseTo(62.5, 2);
      expect(pct[TEAM(1)]).toBeCloseTo(25, 2);
      // T2 and T3 tie for first (shown "1="), then 3rd.
      expect(column(table, "RANK")).toEqual(["1=", "1=", "3"]);
      expect(new Set(column(table, "TEAM").slice(0, 2))).toEqual(
        new Set([TEAM(2), TEAM(3)]),
      );
      expect(await scoringTypeOf(request, gameId)).toBe("BAM");
    } finally {
      await closeDevices(director);
    }
  });

  test("Point-a-Board ranks like Board-a-Match on the same results", async ({
    browser,
    request,
  }) => {
    test.setTimeout(120_000);
    const { table, gameId, director } = await leaderboardOf(
      browser,
      { ...THREE_TEAMS, scoring: "TEAMS_PAB" },
      3,
    );
    try {
      expect(await scoringTypeOf(request, gameId)).toBe("PAB");
      expect(table.headers).toEqual(["RANK", "TEAM", "TOTAL"]);
      // Same boards won, so the same shares and the same tied first place.
      const pct = scoresByName(table, "TEAM", "TOTAL");
      expect(pct[TEAM(2)]).toBeCloseTo(62.5, 2);
      expect(pct[TEAM(3)]).toBeCloseTo(62.5, 2);
      expect(pct[TEAM(1)]).toBeCloseTo(25, 2);
      expect(column(table, "RANK")).toEqual(["1=", "1=", "3"]);
    } finally {
      await closeDevices(director);
    }
  });

  test("IMP (Victory Points): a dead-even match is 10-10 and a blitz is 20-0", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const { table, director } = await leaderboardOf(
      browser,
      { ...THREE_TEAMS, scoring: "TEAMS_IMP_VP" },
      3,
    );
    try {
      expect(table.headers).toEqual(["RANK", "TEAM", "TOTAL", "1", "2", "3"]);
      const [t1m1, t1m2] = perMatch(table, TEAM(1));
      const [, t2m2] = perMatch(table, TEAM(2));
      const [t3m1] = perMatch(table, TEAM(3));

      // Match 1, T1 v T3 finished level on IMPs (+1 -1): 10-10.
      expect([t1m1, t3m1]).toEqual([10, 10]);
      // Match 2, T2 beat T1 by 21 IMPs over two boards, past the top of the
      // scale: the maximum 20-0. Its two rooms were played in different
      // rounds, so this also shows the rooms are paired up.
      expect([t2m2, t1m2]).toEqual([20, 0]);

      // Every match shares out exactly 20 VP between its two teams.
      for (const n of [1, 2, 3]) {
        const shares = table.rows
          .map((r) => parseScore(r[2 + n]))
          .filter((vp) => !Number.isNaN(vp));
        expect(shares).toHaveLength(2);
        expect(shares.reduce((a, b) => a + b, 0)).toBe(20);
      }
      // The total is the sum of the team's matches, and the table is best first.
      const totals = column(table, "TOTAL").map(parseScore);
      table.rows.forEach((r, i) => {
        const matches = r
          .slice(3)
          .map(parseScore)
          .filter((vp) => !Number.isNaN(vp));
        expect(totals[i]).toBeCloseTo(
          matches.reduce((a, b) => a + b, 0),
          2,
        );
      });
      expect([...totals].sort((a, b) => b - a)).toEqual(totals);
    } finally {
      await closeDevices(director);
    }
  });

  test("the director's traveller states each match's IMP swing", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const game = await seedGame({
      ...THREE_TEAMS,
      scoring: "TEAMS_IMP_AGG",
      eventName: `Team traveller ${Date.now()}`,
    });
    const director = await openDirector(browser, game);
    try {
      // Board 3: T1 scored -50 at home and conceded 400 in the other room
      // (played in the other round), a 450 swing = 10 IMPs.
      await openDirectorTraveller(director, game.gameId, 3);
      await expect(director.locator("body")).toContainText(
        /Team A1NS v Team A2NS\s*\+10 IMP/,
      );
      // Board 4: 90 against 620 on a both-vulnerable board = 530 = 11 IMPs.
      await gotoStable(director, `/game/${game.gameId}/manage/travellers`);
      await openDirectorTraveller(director, game.gameId, 4);
      await expect(director.locator("body")).toContainText(
        /Team A1NS v Team A2NS\s*\+11 IMP/,
      );
      // Board 6: both rooms made 2S=, so the match is level on the board.
      await gotoStable(director, `/game/${game.gameId}/manage/travellers`);
      await openDirectorTraveller(director, game.gameId, 6);
      await expect(director.locator("body")).toContainText(
        /Team A2NS v Team A3NS\s*Tied/,
      );
    } finally {
      await closeDevices(director);
    }
  });
});

/**
 * Published-table spot values for the IMP -> VP scale. A single 5-board match
 * (the shortest length in the EBU's published 20-VP table): a 10 IMP margin
 * starts the 15-5 band and a 9 IMP margin is still in the 14-6 band. In a
 * 3-team American Whist at 5 boards a round, T1 v T2 is match 2 (boards 6-10).
 * All the results are part-scores, so vulnerability does not matter.
 */
function fiveBoardMatch(
  lastBoardHome: string,
  lastBoardAway: string,
): TeamMatch {
  return {
    boards: [6, 7, 8, 9, 10],
    homeTable: 1,
    awayTable: 2,
    // Boards 1-4 each swing 60 points (2 IMPs); board 5 is set by the caller.
    homeRoom: ["3SN+1", "2NTN+1", "3SN+1", "3SN+1", lastBoardHome],
    awayRoom: ["2SN=", "1NTN=", "2SN=", "2SN=", lastBoardAway],
  };
}

test.describe("Teams IMP -> Victory Point scale (published values)", () => {
  for (const [home, away, winnerVp, label] of [
    // Board 5: +60 -> 2 IMPs, total 10
    ["2NTN+1", "1NTN=", 15, "a 10 IMP margin is 15-5"],
    // Board 5: +30 -> 1 IMP, total 9
    ["2SN+1", "2SN=", 14, "a 9 IMP margin is 14-6"],
  ] as const) {
    test(`over 5 boards, ${label}`, async ({ browser }) => {
      test.setTimeout(120_000);
      const { table, director } = await leaderboardOf(
        browser,
        {
          scoring: "TEAMS_IMP_VP",
          tables: 3,
          boardsPerRound: 5,
          play: "all",
          outcomes: teamMatchOutcomes([fiveBoardMatch(home, away)]),
        },
        3,
      );
      try {
        // T1 v T2 is match 2; the other matches play the seeder's own results.
        expect(perMatch(table, TEAM(1))[1]).toBe(winnerVp);
        expect(perMatch(table, TEAM(2))[1]).toBe(20 - winnerVp);
      } finally {
        await closeDevices(director);
      }
    });
  }
});

test.describe("Choosing a Teams scoring method when creating a game", () => {
  /** The scoring values the create form offers for a Teams game. */
  async function teamsScoringOptions(page: Page): Promise<string[]> {
    await page.goto("/create/new?step=details");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Event Name").fill("Scoring list");
    await page.getByLabel("Director Name").fill("E2E Director");
    await page.getByLabel("Event Type").selectOption("TEAMS");
    return page
      .getByLabel("Scoring")
      .locator("option")
      .evaluateAll((opts) => opts.map((o) => (o as HTMLOptionElement).value));
  }

  test("offers IMP, IMP Victory Points and the region's board-comparison method", async ({
    browser,
  }) => {
    const page = await newParticipant(browser);
    try {
      const values = await teamsScoringOptions(page);
      // The board-comparison method is Point-a-Board on a UK box and
      // Board-a-Match on a US one: exactly one of the two is offered.
      expect(values).toHaveLength(3);
      expect(values).toEqual(expect.arrayContaining(["IMP", "IMP_VP"]));
      expect(values.filter((v) => v === "BAM" || v === "PAB")).toHaveLength(1);
    } finally {
      await page.context().close();
    }
  });

  test("each method on the form is saved on the game", async ({
    browser,
    request,
  }) => {
    test.setTimeout(180_000);
    const probe = await newParticipant(browser);
    const offered = await teamsScoringOptions(probe).finally(() =>
      probe.context().close(),
    );
    for (const scoring of offered as Array<"IMP" | "IMP_VP" | "BAM" | "PAB">) {
      const page = await newParticipant(browser);
      let gameId: string | null = null;
      try {
        ({ gameId } = await createGame(page, {
          eventName: `Teams ${scoring} ${Date.now()}`,
          recordOpeningLead: false,
          gameType: "TEAMS",
          teamsScoring: scoring,
        }));
        expect(await scoringTypeOf(request, gameId)).toBe(scoring);
      } finally {
        if (gameId) await deleteGame(page, gameId);
        await page.context().close();
      }
    }
  });
});

async function scoringTypeOf(
  request: import("@playwright/test").APIRequestContext,
  gameId: string,
): Promise<string> {
  const res = await request.get(`/api/games/${gameId}`);
  expect(res.ok()).toBeTruthy();
  return (await res.json()).result.game.scoringType;
}
