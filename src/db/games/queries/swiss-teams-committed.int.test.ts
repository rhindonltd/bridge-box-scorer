// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import { matches } from "@/db/games/tables/matches";
/**
 * Integration coverage for the Swiss TEAMS history / committed-round readers
 * over real `matches` rows, including rows whose seat ids are not seats.
 */
describe("swiss teams committed readers", () => {
  let harness: DbHarness;
  let db: Db;
  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
    db = (await harness.getDb()) as Db;
  });
  afterEach(() => {
    harness.teardown();
  });
  let nextId = 1;
  type Row = {
    kind: "TEAMS" | "TRIPLE" | "BYE";
    home: string;
    opponent?: string | null;
    round?: number;
    groupId?: string | null;
    boardStart?: number;
    boardEnd?: number;
  };
  function seed(rows: Row[]) {
    db.insert(matches)
      .values(
        rows.map((r) => ({
          id: nextId++,
          section: "A",
          roundNumber: r.round ?? 1,
          kind: r.kind,
          scoredAsUnit: true,
          home: r.home,
          opponent: r.opponent ?? null,
          groupId: r.groupId ?? null,
          boardStart: r.boardStart ?? 1,
          boardEnd: r.boardEnd ?? 4,
        })),
      )
      .run();
  }
  describe("getSwissTeamsPriorHistory", () => {
    it("collects opponents, byes and triple members from earlier rounds only", async () => {
      seed([
        { kind: "TEAMS", home: "A1NS", opponent: "A2NS" },
        { kind: "BYE", home: "A5NS" },
        // A bye on something that isn't a seat is ignored.
        { kind: "BYE", home: "nonsense" },
        // A triple (group g) with one comparison row naming two teams, one row
        // with a non-seat opponent, and one with a non-seat home.
        { kind: "TRIPLE", home: "A3NS", opponent: "A4NS", groupId: "g" },
        { kind: "TRIPLE", home: "A6NS", opponent: "nonsense", groupId: "g" },
        { kind: "TRIPLE", home: "nonsense", opponent: "A7NS", groupId: "g" },
        // A triple row without a group id adds no members.
        { kind: "TRIPLE", home: "A8NS", opponent: "A9NS", groupId: null },
        // A later round must be excluded.
        { kind: "TEAMS", home: "A10NS", opponent: "A11NS", round: 3 },
      ]);
      const { getSwissTeamsPriorHistory } = await import(
        "@/db/games/queries/swiss-teams-committed"
      );
      const history = await getSwissTeamsPriorHistory(db, "A", 3);
      expect(history.hadBye).toEqual(new Set([5]));
      expect([...history.hadTriple].sort((a, b) => a - b)).toEqual([3, 4, 6, 7]);
      expect(history.playedOpponents.size).toBe(3);
      const { teamOpponentKey } = await import(
        "@/movement/swiss-teams/swiss-teams-pairing"
      );
      expect(history.playedOpponents.has(teamOpponentKey(1, 2))).toBe(true);
      expect(history.playedOpponents.has(teamOpponentKey(10, 11))).toBe(false);
    });
  });
  describe("getSwissTeamsCommittedRound", () => {
    it("returns ordinary head-to-heads, excluding byes and triple teams, and lists triples", async () => {
      seed([
        { kind: "TEAMS", home: "A1NS", opponent: "A2NS" },
        // Ordinary rows with a non-seat or missing side are skipped.
        { kind: "TEAMS", home: "nonsense", opponent: "A9NS" },
        { kind: "TEAMS", home: "A8NS", opponent: null },
        { kind: "BYE", home: "A5NS" },
        { kind: "BYE", home: "nonsense" },
        // Team 3 is in a triple, so its ordinary match with team 4... leaves 4
        // pointing at an excluded opponent and 4 drops out too.
        { kind: "TEAMS", home: "A3NS", opponent: "A4NS" },
        // Triple g: comparisons 6v7 (boards 1-2) and 6v... listed out of order.
        {
          kind: "TRIPLE",
          home: "A7NS",
          opponent: "A6NS",
          groupId: "g",
          boardStart: 3,
          boardEnd: 4,
        },
        {
          kind: "TRIPLE",
          home: "A6NS",
          opponent: "A3NS",
          groupId: "g",
          boardStart: 1,
          boardEnd: 2,
        },
        // Triple rows missing a side or group add no comparison.
        { kind: "TRIPLE", home: "nonsense", opponent: "A10NS", groupId: "h" },
        { kind: "TRIPLE", home: "A11NS", opponent: "nonsense", groupId: "h" },
        { kind: "TRIPLE", home: "A12NS", opponent: "A13NS", groupId: null },
        // Other round: ignored.
        { kind: "TEAMS", home: "A20NS", opponent: "A21NS", round: 2 },
      ]);
      const { getSwissTeamsCommittedRound } = await import(
        "@/db/games/queries/swiss-teams-committed"
      );
      const round = await getSwissTeamsCommittedRound(db, "A", 1);
      expect(round.roundNumber).toBe(1);
      expect([...round.opponentByTeam.entries()].sort()).toEqual([
        [1, 2],
        [2, 1],
      ]);
      expect([...round.homeTableByTeam.keys()].sort((a, b) => a - b)).toEqual([
        1, 2, 3, 4,
      ]);
      expect([...round.excludedTeams].sort((a, b) => a - b)).toEqual([
        3, 5, 6, 7, 10, 11, 12, 13,
      ]);
      expect(round.triples).toEqual([
        {
          members: [3, 6, 7],
          comparisons: [
            { low: 3, high: 6, boardStart: 1, boardEnd: 2 },
            { low: 6, high: 7, boardStart: 3, boardEnd: 4 },
          ],
        },
      ]);
    });
    it("orders comparisons sharing a low team by their high team", async () => {
      seed([
        { kind: "TRIPLE", home: "A1NS", opponent: "A3NS", groupId: "g" },
        { kind: "TRIPLE", home: "A1NS", opponent: "A2NS", groupId: "g" },
      ]);
      const { getSwissTeamsCommittedRound } = await import(
        "@/db/games/queries/swiss-teams-committed"
      );
      const round = await getSwissTeamsCommittedRound(db, "A", 1);
      expect(round.triples[0].comparisons.map((c) => c.high)).toEqual([2, 3]);
    });
  });
});
