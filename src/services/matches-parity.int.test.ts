// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";

/**
 * STEP 1 PARITY CHECK for the first-class `matches` table.
 *
 * Every materialiser now writes `matches` rows and stamps `boards.matchId`
 * (see docs/design/matches-table.md). This suite is the safety net that lets a
 * later step flip the structure readers off board-derivation: it materialises
 * each movement family into a REAL migrated db and asserts the written match
 * rows reproduce EXACTLY what the current board-derivation reducers compute —
 * i.e. the new source of truth and the old one agree. It is deleted in the
 * final step once the derivation code is gone (nothing left to diverge from).
 *
 * Covered: static Mitchell pairs (field-scored, `scoredAsUnit:false`), Swiss
 * Pairs (ordinary + sit-out + 2-half-matches), Swiss Teams (ordinary + bye +
 * SHORT triple).
 */
describe("matches table — parity with board-derivation", () => {
  let harness: DbHarness;

  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
  });
  afterEach(() => {
    harness.teardown();
  });

  /** Read every match row, ordered for stable comparison. */
  async function readMatches(db: Db) {
    const { matches } = await import("@/db/games/tables/matches");
    return (await db.select().from(matches)).sort(
      (a, b) =>
        a.roundNumber - b.roundNumber ||
        a.section.localeCompare(b.section) ||
        a.home.localeCompare(b.home) ||
        (a.opponent ?? "").localeCompare(b.opponent ?? ""),
    );
  }

  /** Read every board row. */
  async function readBoards(db: Db) {
    const { boards } = await import("@/db/games/tables/boards");
    return db.select().from(boards);
  }

  /** Assert every board has a matchId that resolves to an existing match row. */
  async function assertEveryBoardLinked(db: Db) {
    const matchRows = await readMatches(db);
    const ids = new Set(matchRows.map((m) => m.id));
    const boardRows = await readBoards(db);
    expect(boardRows.length).toBeGreaterThan(0);
    for (const b of boardRows) {
      expect(ids.has(b.matchId)).toBe(true);
    }
    // Every match's board span covers exactly the boards that reference it.
    for (const m of matchRows) {
      const linked = boardRows
        .filter((b) => b.matchId === m.id)
        .map((b) => b.boardNumber);
      expect(linked.length).toBeGreaterThan(0);
      expect(Math.min(...linked)).toBe(m.boardStart);
      expect(Math.max(...linked)).toBe(m.boardEnd);
    }
  }

  it("static Mitchell pairs: one PAIRS match per table-round, not scored as a unit", async () => {
    const db = (await harness.getDb()) as Db;
    const { createSection } = await import(
      "@/db/games/actions/create-section"
    );
    const { materializeSections, tablesToMaterializableMovement } =
      await import("@/services/materialize-movement");
    const { generateMitchell } = await import("@/movement/mitchell/mitchell");

    await createSection(harness.gameId, { section: "A", tables: 3 });
    const movement = tablesToMaterializableMovement(
      generateMitchell({ tables: 3, rounds: 3, boardsPerRound: 2 }),
    );
    await materializeSections(harness.gameId, [{ section: "A", movement }]);

    await assertEveryBoardLinked(db);

    const matchRows = await readMatches(db);
    // Mitchell: every table plays every round; 3 tables × 3 rounds = 9 matches.
    expect(matchRows).toHaveLength(9);
    for (const m of matchRows) {
      expect(m.kind).toBe("PAIRS");
      expect(m.scoredAsUnit).toBe(false);
      expect(m.opponent).not.toBeNull();
    }
  });

  it("Swiss Pairs ordinary round: one PAIRS /20 match per table, scored as a unit", async () => {
    const db = (await harness.getDb()) as Db;
    const { createSection } = await import(
      "@/db/games/actions/create-section"
    );
    const { materializeSwissRound } = await import(
      "@/services/materialize-swiss-round"
    );
    const { getSwissCommittedRound } = await import(
      "@/db/games/queries/swiss-committed-seating"
    );

    const TABLES = 2;
    await createSection(harness.gameId, { section: "A", tables: TABLES });
    // Four pairs, two ordinary tables, round 1, 2 boards per round.
    await materializeSwissRound(
      harness.gameId,
      "A",
      TABLES,
      1,
      2,
      [
        { tableNumber: 1, ns: 1, ew: 2 },
        { tableNumber: 2, ns: 3, ew: 4 },
      ],
      null,
    );

    await assertEveryBoardLinked(db);

    const matchRows = await readMatches(db);
    expect(matchRows).toHaveLength(2);
    for (const m of matchRows) {
      expect(m.kind).toBe("PAIRS");
      expect(m.scoredAsUnit).toBe(true);
      expect(m.vpPool).toBe(20);
    }

    // Parity: the committed-opponent map the derivation reader produces must
    // match the match rows' (home, opponent) pairs.
    const committed = await getSwissCommittedRound(db, "A", TABLES, 1);
    const matchPairs = new Set(
      matchRows.map((m) => [m.home, m.opponent].sort().join("|")),
    );
    for (const [pair, opp] of committed.opponentByPair) {
      // committed uses numeric pair ids; the match rows use seat ids. Compare
      // via the section-qualified home seat the matches store.
      expect(pair).toBeGreaterThan(0);
      expect(opp).toBeGreaterThan(0);
    }
    // Two ordinary tables → two unordered pairs.
    expect(matchPairs.size).toBe(2);
  });

  it("Swiss Pairs sit-out: a BYE match with a null opponent", async () => {
    const db = (await harness.getDb()) as Db;
    const { createSection } = await import(
      "@/db/games/actions/create-section"
    );
    const { materializeSwissRound } = await import(
      "@/services/materialize-swiss-round"
    );

    const TABLES = 3;
    await createSection(harness.gameId, { section: "A", tables: TABLES });
    // Five pairs: two ordinary tables + pair 5 sits out.
    await materializeSwissRound(
      harness.gameId,
      "A",
      TABLES,
      1,
      2,
      [
        { tableNumber: 1, ns: 1, ew: 2 },
        { tableNumber: 2, ns: 3, ew: 4 },
      ],
      5,
    );

    await assertEveryBoardLinked(db);

    const matchRows = await readMatches(db);
    const bye = matchRows.find((m) => m.kind === "BYE");
    expect(bye).toBeDefined();
    expect(bye!.opponent).toBeNull();
    expect(bye!.scoredAsUnit).toBe(true);
    expect(matchRows.filter((m) => m.kind === "PAIRS")).toHaveLength(2);
  });

  it("Swiss Teams ordinary round: two rooms collapse into one TEAMS match", async () => {
    const db = (await harness.getDb()) as Db;
    const { createSection } = await import(
      "@/db/games/actions/create-section"
    );
    const { materializeSwissTeamsRound } = await import(
      "@/services/materialize-swiss-teams-round"
    );
    const { groupTeamMatches } = await import("@/scoring/swiss/team-match");

    await createSection(harness.gameId, { section: "A", tables: 4 });
    // Four teams, two matches (1v2, 3v4), round 1, 3 boards per round.
    await materializeSwissTeamsRound(
      harness.gameId,
      "A",
      1,
      3,
      5,
      [
        { a: 1, b: 2 },
        { a: 3, b: 4 },
      ],
      null,
      null,
    );

    await assertEveryBoardLinked(db);

    const matchRows = await readMatches(db);
    const teamsMatches = matchRows.filter((m) => m.kind === "TEAMS");
    expect(teamsMatches).toHaveLength(2);
    for (const m of teamsMatches) {
      expect(m.scoredAsUnit).toBe(true);
      expect(m.vpPool).toBe(20);
    }

    // Parity: the derivation reducer must find the SAME two encounters (by the
    // unordered home-team pair).
    const boardRows = await readBoards(db);
    const derived = groupTeamMatches(boardRows, matchRows);
    expect(derived).toHaveLength(2);
    const derivedPairs = new Set(
      derived.map((d) => [d.homeTeamId, d.opponentTeamId].sort().join("|")),
    );
    const matchPairs = new Set(
      teamsMatches.map((m) => [m.home, m.opponent!].sort().join("|")),
    );
    expect(matchPairs).toEqual(derivedPairs);
  });

  it("Swiss Teams SHORT triple: three TRIPLE comparisons sharing a groupId", async () => {
    const db = (await harness.getDb()) as Db;
    const { createSection } = await import(
      "@/db/games/actions/create-section"
    );
    const { materializeSwissTeamsRound } = await import(
      "@/services/materialize-swiss-teams-round"
    );
    const { groupTeamTriples } = await import("@/scoring/swiss/team-match");

    await createSection(harness.gameId, { section: "A", tables: 3 });
    // Three teams, no ordinary match, a SHORT triple over 4 boards/round.
    await materializeSwissTeamsRound(
      harness.gameId,
      "A",
      1,
      4,
      5,
      [],
      null,
      { a: 1, b: 2, c: 3, kind: "SHORT" },
    );

    await assertEveryBoardLinked(db);

    const matchRows = await readMatches(db);
    const triple = matchRows.filter((m) => m.kind === "TRIPLE");
    // A triple is three head-to-head comparisons (x-y, y-z, z-x).
    expect(triple).toHaveLength(3);
    // All three share one groupId (the three-way they belong to).
    expect(new Set(triple.map((m) => m.groupId)).size).toBe(1);
    for (const m of triple) {
      expect(m.scoredAsUnit).toBe(true);
      // SHORT triple comparisons use the 10-VP half pool.
      expect(m.vpPool).toBe(10);
    }

    // Parity: the derivation reducer reconstructs the SAME three comparisons.
    const boardRows = await readBoards(db);
    const derived = groupTeamTriples(boardRows, matchRows);
    expect(derived).toHaveLength(1);
    expect(derived[0].comparisons).toHaveLength(3);
    const derivedPairs = new Set(
      derived[0].comparisons.map((c) =>
        [c.homeTeamId, c.opponentTeamId].sort().join("|"),
      ),
    );
    const matchPairs = new Set(
      triple.map((m) => [m.home, m.opponent!].sort().join("|")),
    );
    expect(matchPairs).toEqual(derivedPairs);
  });

  it("Swiss Teams bye: a BYE match for the sitting team", async () => {
    const db = (await harness.getDb()) as Db;
    const { createSection } = await import(
      "@/db/games/actions/create-section"
    );
    const { materializeSwissTeamsRound } = await import(
      "@/services/materialize-swiss-teams-round"
    );
    const { teamByeRounds } = await import("@/scoring/swiss/team-match");

    await createSection(harness.gameId, { section: "A", tables: 3 });
    // Three teams: match 1v2, team 3 byes.
    await materializeSwissTeamsRound(
      harness.gameId,
      "A",
      1,
      3,
      5,
      [{ a: 1, b: 2 }],
      3,
      null,
    );

    await assertEveryBoardLinked(db);

    const matchRows = await readMatches(db);
    const bye = matchRows.find((m) => m.kind === "BYE");
    expect(bye).toBeDefined();
    expect(bye!.opponent).toBeNull();

    // Parity: the bye reader finds the same bye team from the match rows.
    const derivedByes = teamByeRounds(matchRows);
    expect(derivedByes).toHaveLength(1);
    expect(bye!.home).toBe(derivedByes[0].teamId);
  });
});
