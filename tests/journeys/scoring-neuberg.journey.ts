import { test, expect, type Browser } from "@playwright/test";
import { enterPlayedContract } from "../fixtures/play";
import { MITCHELL_PAIRS_RESULTS } from "../fixtures/scoring-scenarios";
import {
  parseScore,
  readScoreTables,
  tableWithHeader,
} from "../fixtures/score-tables";
import {
  closeDevices,
  openSeat,
  seedGame,
  type SeedGameOptions,
} from "../fixtures/seeded-game";
import { newParticipant } from "./support";

/**
 * Matchpoints, and Neuberg equalisation of short boards (EBU White Book §4.2.3).
 *
 * A board played fewer times than the others is matchpointed among its own
 * results, then scaled up so every board carries the same weight in the
 * standings. With E results on a full board and A on this one (A > 3 or
 * A > E/3), a line's matchpoints M (single scale, top A-1) become
 * M' = (M + 1) x E / A - 1.
 *
 * Here E = 3. A pair withdrawing from the last round with its missed boards
 * Removed takes one line off each of boards 5 and 6, leaving A = 2. On the
 * doubled scale the app uses (a board's top is 2 x (E-1) = 4):
 *   the better result:  M = 1 -> (1 + 1) x 3/2 - 1 = 2   -> 4 of 4
 *   the worse result:   M = 0 -> (0 + 1) x 3/2 - 1 = 0.5 -> 1 of 4
 * (without equalisation the two lines would score 2 and 0 of a top of 2).
 * Standings below were worked with an independent calculation of the rule.
 *
 * The fixed-percentage rule for very small groups (A of 2 or 3 and no more than
 * a third of the field, §4.2.3.3) needs a board played far fewer times than a
 * field of six or more; it is covered by unit tests, not here.
 */
const MP_GAME = {
  scoring: "MP",
  tables: 3,
  rounds: 3,
  boardsPerRound: 2,
  leadCardRequired: false,
  outcomes: MITCHELL_PAIRS_RESULTS,
} satisfies SeedGameOptions;

/** A1NS withdraws from round 3 (boards 5 and 6) and the missed boards are removed. */
const NEUBERG_GAME = {
  ...MP_GAME,
  play: "partial",
  finish: true,
  scenario: { withdraw: ["A1NS@3"], treatment: { A1NS: "REMOVED" } },
} satisfies SeedGameOptions;

const pairName = (seat: string) => `P${seat} North P${seat} South`;

/** Open the room-display leaderboard and read the North/South and East/West lists. */
async function standings(browser: Browser, gameId: string) {
  const page = await newParticipant(browser);
  try {
    await page.goto(`/game/${gameId}/display/leaderboard`);
    await expect(page.getByTestId("leaderboard-row")).toHaveCount(6, {
      timeout: 20000,
    });
    const lists = (await readScoreTables(page)).filter((t) =>
      t.headers.includes("%"),
    );
    expect(lists).toHaveLength(2);
    const read = (i: number) =>
      lists[i].rows.map((r) => ({
        rank: r[0],
        pair: r[1],
        pct: parseScore(r[2]),
      }));
    return { ns: read(0), ew: read(1), lists };
  } finally {
    await page.context().close();
  }
}

test.describe("Matchpoints and Neuberg equalisation", () => {
  test("matchpoint standings are percentages of the top, one list per direction", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const game = await seedGame({
      ...MP_GAME,
      play: "all",
      eventName: `MP ${Date.now()}`,
    });
    const { ns, ew, lists } = await standings(browser, game.gameId);
    expect(lists[0].headers).toEqual(["RANK", "PAIR", "%"]);
    // Every board has three results (a top of 4), six boards a pair.
    expect(ns).toEqual([
      { rank: "1", pair: pairName("A1NS"), pct: 58.33 },
      { rank: "2", pair: pairName("A2NS"), pct: 50 },
      { rank: "3", pair: pairName("A3NS"), pct: 41.67 },
    ]);
    expect(ew).toEqual([
      { rank: "1", pair: pairName("A3EW"), pct: 66.67 },
      { rank: "2", pair: pairName("A2EW"), pct: 50 },
      { rank: "3", pair: pairName("A1EW"), pct: 33.33 },
    ]);
  });

  test("short boards are scaled to the full top, and tied pairs share a rank", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const game = await seedGame({
      ...NEUBERG_GAME,
      eventName: `Neuberg ${Date.now()}`,
    });
    const { ns, ew } = await standings(browser, game.gameId);
    // A1NS and A2EW have four boards each; boards 5 and 6 have two results
    // instead of three, scaled up by Neuberg. A1NS and A3NS tie on 50.00.
    expect(ns).toEqual([
      { rank: "1", pair: pairName("A2NS"), pct: 58.33 },
      { rank: "2=", pair: pairName("A1NS"), pct: 50 },
      { rank: "2=", pair: pairName("A3NS"), pct: 50 },
    ]);
    expect(ew).toEqual([
      { rank: "1", pair: pairName("A2EW"), pct: 62.5 },
      { rank: "2", pair: pairName("A3EW"), pct: 58.33 },
      { rank: "3", pair: pairName("A1EW"), pct: 25 },
    ]);
  });

  test("a short board's traveller shows its own field; the scaling is applied in the standings", async ({
    browser,
  }) => {
    test.setTimeout(150_000);
    // Board 5 (round 2, table 2: A2NS v A1EW) is played through the app. Its
    // other result (round 1, table 3) is seeded; round 3's would-be third
    // result is the removed one. Later plays are held back so these pairs'
    // game is still in progress when they reach board 5.
    const game = await seedGame({
      ...NEUBERG_GAME,
      holdBack: ["5@2", "1@2", "2@2", "3@3", "4@3"],
      eventName: `Neuberg traveller ${Date.now()}`,
    });
    const ns = await openSeat(browser, game, "A2NS");
    const ew = await openSeat(browser, game, "A1EW");
    try {
      // 1NT by North making exactly: 90 (the seeded result for this play).
      const spec = {
        level: 1,
        suit: "NT",
        declarer: "N",
        result: { mode: "made", value: 0 },
      } as const;
      await enterPlayedContract(ns, game.gameId, "A2NS", 5, spec, {
        leadCardRequired: false,
      });
      await expect(ns.getByText("Waiting for confirmation")).toBeVisible({
        timeout: 15000,
      });
      await enterPlayedContract(ew, game.gameId, "A1EW", 5, spec, {
        leadCardRequired: false,
      });
      await expect(ns.getByText("Board Results")).toBeVisible({
        timeout: 15000,
      });

      // The traveller compares the board's own results: two of them, so the
      // 90 beats the -110 for 2 of a top of 2 (100%) and the -110 gets 0.
      // (Neuberg then lifts these to 4 and 1 of a top of 4 when the standings
      // are built - see the leaderboard test above.)
      const pctView = tableWithHeader(await readScoreTables(ns), "NS %");
      expect(pctView.rows).toHaveLength(2); // two results, not three
      const pct = (nsSeat: string) => {
        const row = pctView.rows.find((r) => r[0].includes(nsSeat))!;
        return { nsPct: parseScore(row[4]), ewPct: parseScore(row[5]) };
      };
      expect(pct("A2NS")).toEqual({ nsPct: 100, ewPct: 0 });
      expect(pct("A3NS")).toEqual({ nsPct: 0, ewPct: 100 });

      await ns.getByRole("button", { name: "MP", exact: true }).click();
      const traveller = tableWithHeader(await readScoreTables(ns), "NS MP");
      expect(traveller.headers).toEqual([
        "NS",
        "EW",
        "CONTRACT",
        "NS SCORE",
        "NS MP",
        "EW MP",
      ]);
      const line = (nsSeat: string) => {
        const row = traveller.rows.find((r) => r[0].includes(nsSeat))!;
        return {
          score: parseScore(row[3]),
          nsMp: parseScore(row[4]),
          ewMp: parseScore(row[5]),
        };
      };
      expect(line("A2NS")).toEqual({ score: 90, nsMp: 2, ewMp: 0 });
      expect(line("A3NS")).toEqual({ score: -110, nsMp: 0, ewMp: 2 });
    } finally {
      await closeDevices(ns, ew);
    }
  });
});
