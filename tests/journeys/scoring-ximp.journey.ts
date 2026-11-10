import { test, expect, type Browser, type Page } from "@playwright/test";
import { createGame } from "../fixtures/game-create";
import { deleteGame } from "../fixtures/delete-game";
import {
  openDirectorTraveller,
  overrideRowToContract,
} from "../fixtures/director-override";
import { enterPlayedContract } from "../fixtures/play";
import { MITCHELL_PAIRS_RESULTS } from "../fixtures/scoring-scenarios";
import {
  column,
  parseScore,
  readScoreTables,
  tableWithHeader,
  type ScoreTableData,
} from "../fixtures/score-tables";
import {
  closeDevices,
  openDirector,
  openSeat,
  seedGame,
  type SeedGameOptions,
} from "../fixtures/seeded-game";
import { newParticipant } from "./support";

/**
 * Pairs Cross-IMPs through the real screens. Cross-IMPs compare each result on
 * a board with every other result and average them, and a pair's standing is its
 * average per board. The maths is unit tested; these prove the wiring and the
 * figures the director and players actually see, against a hand-built game
 * (see MITCHELL_PAIRS_RESULTS for the results and the worked example).
 */
const XIMP_GAME = {
  scoring: "XIMP",
  tables: 3,
  rounds: 3,
  boardsPerRound: 2,
  leadCardRequired: false,
  outcomes: MITCHELL_PAIRS_RESULTS,
} satisfies SeedGameOptions;

const pairName = (seat: string) => `P${seat} North P${seat} South`;

/** The two leaderboard lists (North/South, East/West) as seat -> X-IMP. */
function standings(tables: ScoreTableData[]) {
  const lists = tables.filter((t) => t.headers.includes("X-IMP"));
  expect(lists).toHaveLength(2);
  const read = (t: ScoreTableData) =>
    Object.fromEntries(
      column(t, "PAIR").map((name, i) => [
        name,
        parseScore(column(t, "X-IMP")[i]),
      ]),
    );
  return { ns: read(lists[0]), ew: read(lists[1]), lists };
}

async function openLeaderboard(
  browser: Browser,
  gameId: string,
  rows: number,
): Promise<Page> {
  const page = await newParticipant(browser);
  await page.goto(`/game/${gameId}/display/leaderboard`);
  await expect(page.getByTestId("leaderboard-row")).toHaveCount(rows, {
    timeout: 20000,
  });
  return page;
}

test.describe("Pairs Cross-IMPs", () => {
  test("the leaderboard ranks each side on average cross-IMPs per board", async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const game = await seedGame({
      ...XIMP_GAME,
      play: "all",
      eventName: `XIMP ${Date.now()}`,
    });
    const display = await openLeaderboard(browser, game.gameId, 6);
    try {
      const { ns, ew, lists } = standings(await readScoreTables(display));
      // Cross-IMP figures, not percentages, to two decimals; negatives allowed.
      expect(lists[0].headers).toEqual(["RANK", "PAIR", "X-IMP"]);
      expect(ns[pairName("A2NS")]).toBeCloseTo(0.42, 2);
      expect(ns[pairName("A1NS")]).toBeCloseTo(-0.08, 2);
      expect(ns[pairName("A3NS")]).toBeCloseTo(-0.33, 2);
      expect(ew[pairName("A3EW")]).toBeCloseTo(1.83, 2);
      expect(ew[pairName("A2EW")]).toBeCloseTo(-0.67, 2);
      expect(ew[pairName("A1EW")]).toBeCloseTo(-1.17, 2);

      // Each list is best first and ranked 1, 2, 3.
      for (const list of lists) {
        expect(column(list, "RANK")).toEqual(["1", "2", "3"]);
        const values = column(list, "X-IMP").map(parseScore);
        expect([...values].sort((a, b) => b - a)).toEqual(values);
      }
      // There is only the one presentation: no percentage/matchpoint prompt.
      await expect(display.getByText("Show standings as")).toHaveCount(0);
    } finally {
      await closeDevices(display);
    }
  });

  test("a board's traveller shows each line's cross-IMPs, and they cancel out", async ({
    browser,
  }) => {
    test.setTimeout(150_000);
    // Board 3 at table 3 is the last board of the last round: it is left for the
    // pair there (A3NS v A1EW) to play through the app, with every other play
    // seeded, so the traveller they land on has all three lines.
    const game = await seedGame({
      ...XIMP_GAME,
      play: "all",
      holdBack: ["3@3"],
      eventName: `XIMP traveller ${Date.now()}`,
    });
    const ns = await openSeat(browser, game, "A3NS");
    const ew = await openSeat(browser, game, "A1EW");
    try {
      // 2S+1 by North = 140, the result the seeded game has for this play.
      // (Round 3 at table 3 is A3NS v A1EW: the East/West pairs move, so the
      // seats are named explicitly rather than assumed from the table number.)
      const spec = {
        level: 2,
        suit: "S",
        declarer: "N",
        result: { mode: "made", value: 1 },
      } as const;
      await enterPlayedContract(ns, game.gameId, "A3NS", 3, spec, {
        leadCardRequired: false,
      });
      await expect(ns.getByText("Waiting for confirmation")).toBeVisible({
        timeout: 15000,
      });
      await enterPlayedContract(ew, game.gameId, "A1EW", 3, spec, {
        leadCardRequired: false,
      });
      await expect(ns.getByText("Board Results")).toBeVisible({
        timeout: 15000,
      });
      const traveller = tableWithHeader(await readScoreTables(ns), "NS IMP");
      expect(traveller.headers).toEqual([
        "NS",
        "EW",
        "CONTRACT",
        "NS SCORE",
        "NS IMP",
        "EW IMP",
      ]);
      expect(traveller.rows).toHaveLength(3);

      // Board 3 scores are -90, 120 and 140:
      //   -90 -> (IMP(-210) + IMP(-230)) / 2 = (-5 - 6) / 2 = -5.5
      //   120 -> (IMP(210)  + IMP(-20))  / 2 = ( 5 - 1) / 2 = +2
      //   140 -> (IMP(230)  + IMP(20))   / 2 = ( 6 + 1) / 2 = +3.5
      // East/West get the mirror image on every line.
      const read = (nsSeat: string) => {
        const row = traveller.rows.find((r) => r[0].includes(nsSeat))!;
        return {
          score: parseScore(row[3]),
          nsImp: parseScore(row[4]),
          ewImp: parseScore(row[5]),
        };
      };
      expect(read("A1NS")).toEqual({ score: -90, nsImp: -5.5, ewImp: 5.5 });
      expect(read("A2NS")).toEqual({ score: 120, nsImp: 2, ewImp: -2 });
      expect(read("A3NS")).toEqual({ score: 140, nsImp: 3.5, ewImp: -3.5 });
      // The cross-IMPs on a board cancel out.
      const nsTotal = traveller.rows
        .map((r) => parseScore(r[4]))
        .reduce((a, b) => a + b, 0);
      expect(nsTotal).toBe(0);
    } finally {
      await closeDevices(ns, ew);
    }
  });

  test("a director's correction re-scores the standings live", async ({
    browser,
  }) => {
    test.setTimeout(150_000);
    const game = await seedGame({
      ...XIMP_GAME,
      play: "all",
      eventName: `XIMP override ${Date.now()}`,
    });
    const display = await openLeaderboard(browser, game.gameId, 6);
    const director = await openDirector(browser, game);
    try {
      const before = standings(await readScoreTables(display));
      expect(before.ns[pairName("A1NS")]).toBeCloseTo(-0.08, 2);

      // Board 6 at table 2 (round 2) was 3S+1 (170); correct it to 2S= (110).
      await openDirectorTraveller(director, game.gameId, 6);
      await overrideRowToContract(
        director,
        "traveller-row-2-2",
        {
          level: 2,
          suit: "S",
          declarer: "N",
          result: { mode: "made", value: 0 },
        },
        { leadCardRequired: false },
      );

      // The mounted display re-scores without a reload.
      await expect
        .poll(
          async () =>
            standings(await readScoreTables(display)).ns[pairName("A2NS")],
          { timeout: 20000 },
        )
        .toBeCloseTo(0.17, 2);
      const after = standings(await readScoreTables(display));
      expect(after.ns[pairName("A1NS")]).toBeCloseTo(0.08, 2);
      expect(after.ns[pairName("A3NS")]).toBeCloseTo(-0.25, 2);
      expect(after.ew[pairName("A3EW")]).toBeCloseTo(1.75, 2);
      expect(after.ew[pairName("A2EW")]).toBeCloseTo(-0.83, 2);
      expect(after.ew[pairName("A1EW")]).toBeCloseTo(-0.92, 2);
    } finally {
      await closeDevices(display, director);
    }
  });

  test("by default a withdrawn pair's missed boards score -3 IMPs to it and +3 to its opponents", async ({
    browser,
  }) => {
    test.setTimeout(150_000);
    // Same withdrawal as below (A1NS out of round 3: boards 5 and 6 against
    // A2EW), left on the default AVE-/AVE+ treatment. The other pairs are
    // compared exactly as when the boards are removed; the absent pair gets
    // -3 on each of its two missed boards and its opponents +3, over all six
    // boards. Neither side's own average is past 3 IMPs, so the better-than-
    // average adjustment does not apply:
    //   A1NS: (4 played boards, total -6.0, then 2 x -3)  / 6 = -2.00
    //   A2EW: (4 played boards, total +1.5, then 2 x +3)  / 6 = +1.25
    const game = await seedGame({
      ...XIMP_GAME,
      play: "partial",
      finish: true,
      scenario: { withdraw: ["A1NS@3"] },
      eventName: `XIMP average ${Date.now()}`,
    });
    const display = await openLeaderboard(browser, game.gameId, 6);
    try {
      const { ns, ew, lists } = standings(await readScoreTables(display));
      expect(ns[pairName("A1NS")]).toBeCloseTo(-2.0, 2);
      expect(ew[pairName("A2EW")]).toBeCloseTo(1.25, 2);
      // Everyone else is untouched by the absent boards.
      expect(ns[pairName("A2NS")]).toBeCloseTo(1.33, 2);
      expect(ns[pairName("A3NS")]).toBeCloseTo(-0.33, 2);
      expect(ew[pairName("A3EW")]).toBeCloseTo(1.83, 2);
      expect(ew[pairName("A1EW")]).toBeCloseTo(-2.08, 2);
      // The withdrawn pair is still ranked (it keeps its place, last of NS).
      expect(column(lists[0], "RANK")).toEqual(["1", "2", "3"]);
      expect(column(lists[0], "PAIR")[2]).toBe(pairName("A1NS"));
    } finally {
      await closeDevices(display);
    }
  });

  test("a withdrawn pair whose missed boards are removed drops out of the comparison", async ({
    browser,
  }) => {
    test.setTimeout(150_000);
    // A1NS withdraws from round 3 (boards 5 and 6 against A2EW) and the missed
    // boards are Removed: those two lines don't exist, boards 5 and 6 are
    // compared across two lines, and A1NS and A2EW have four boards each.
    const game = await seedGame({
      ...XIMP_GAME,
      play: "partial",
      finish: true,
      scenario: { withdraw: ["A1NS@3"], treatment: { A1NS: "REMOVED" } },
      eventName: `XIMP removed ${Date.now()}`,
    });
    const display = await openLeaderboard(browser, game.gameId, 6);
    try {
      const { ns, ew } = standings(await readScoreTables(display));
      expect(ns[pairName("A2NS")]).toBeCloseTo(1.33, 2);
      expect(ns[pairName("A3NS")]).toBeCloseTo(-0.33, 2);
      expect(ns[pairName("A1NS")]).toBeCloseTo(-1.5, 2);
      expect(ew[pairName("A3EW")]).toBeCloseTo(1.83, 2);
      expect(ew[pairName("A2EW")]).toBeCloseTo(0.38, 2);
      expect(ew[pairName("A1EW")]).toBeCloseTo(-2.08, 2);
    } finally {
      await closeDevices(display);
    }
  });

  test("choosing Cross-IMPs on the create form is saved on the game", async ({
    browser,
    request,
  }) => {
    test.setTimeout(90_000);
    const page = await newParticipant(browser);
    let gameId: string | null = null;
    try {
      ({ gameId } = await createGame(page, {
        eventName: `XIMP create ${Date.now()}`,
        recordOpeningLead: false,
        pairsScoring: "XIMP",
      }));
      const res = await request.get(`/api/games/${gameId}`);
      expect((await res.json()).result.game.scoringType).toBe("XIMP");
    } finally {
      if (gameId) await deleteGame(page, gameId);
      await page.context().close();
    }
  });
});
