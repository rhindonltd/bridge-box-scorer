// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import { boards } from "@/db/games/tables/boards";
import { matches, type NewMatch } from "@/db/games/tables/matches";

describe("readTeamMatchRounds", () => {
  let harness: DbHarness;

  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
  });

  afterEach(() => {
    harness.teardown();
  });

  function insertMatch(db: Db, row: Partial<NewMatch>): number {
    const info = db
      .insert(matches)
      .values({
        section: "A",
        roundNumber: 1,
        kind: "TEAMS",
        scoredAsUnit: true,
        home: "A1NS",
        opponent: "A2NS",
        boardStart: 1,
        boardEnd: 2,
        ...row,
      })
      .run();
    return Number(info.lastInsertRowid);
  }

  function insertBoard(
    db: Db,
    matchId: number,
    roundNumber: number,
    tableNumber: number,
    boardNumber: number,
  ): void {
    db.insert(boards)
      .values({
        section: "A",
        roundNumber,
        tableNumber,
        boardNumber,
        ns: `A${tableNumber}NS`,
        ew: "A9EW",
        matchId,
      })
      .run();
  }

  it("spans each teams match over the rounds its boards are played in", async () => {
    const db = (await harness.getDb()) as Db;
    const { readTeamMatchRounds } =
      await import("@/db/games/queries/team-match-rounds");

    // A match whose two rooms are played in rounds 1 and 3.
    const split = insertMatch(db, {});
    insertBoard(db, split, 1, 1, 1);
    insertBoard(db, split, 3, 2, 1);
    // A triple comparison played in round 2.
    const triple = insertMatch(db, {
      kind: "TRIPLE",
      home: "A3NS",
      opponent: "A4NS",
    });
    insertBoard(db, triple, 2, 3, 5);
    // A pairs match is not a teams match.
    const pairs = insertMatch(db, { kind: "PAIRS", scoredAsUnit: false });
    insertBoard(db, pairs, 1, 5, 9);

    const rows = await readTeamMatchRounds(db);
    expect(rows).toEqual(
      expect.arrayContaining([
        { home: "A1NS", opponent: "A2NS", firstRound: 1, lastRound: 3 },
        { home: "A3NS", opponent: "A4NS", firstRound: 2, lastRound: 2 },
      ]),
    );
    expect(rows).toHaveLength(2);
  });
});
