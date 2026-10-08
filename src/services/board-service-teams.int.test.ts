// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";

/**
 * Integration coverage for buildTeamTravellerMatches, which reads the
 * first-class `matches` table (authoritative for "which two teams met over this
 * board") rather than re-inferring the pairing from board seatings. Each test
 * materialises a REAL Swiss Teams round, enters results, and asserts the
 * team-vs-team framing the director traveller renders.
 *
 * A team's id is its home NS seat ("A1NS"); the open room sits at the home
 * team's table, the closed room at the opponent's. The margin is the net IMPs
 * on the board from the home (lower-id) team's perspective.
 */
describe("buildTeamTravellerMatches (reads the matches table)", () => {
  let harness: DbHarness;

  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
  });
  afterEach(() => {
    harness.teardown();
  });

  /** Set a confirmed result on a specific (section, round, table, board). */
  async function setResult(
    db: Db,
    tableNumber: number,
    boardNumber: number,
    result: string,
  ) {
    const { boards } = await import("@/db/games/tables/boards");
    const { and, eq } = await import("drizzle-orm");
    await db
      .update(boards)
      .set({ confirmedResult: result as never, status: "CONFIRMED" })
      .where(
        and(
          eq(boards.section, "A"),
          eq(boards.tableNumber, tableNumber),
          eq(boards.boardNumber, boardNumber),
        ),
      );
  }

  it("groups a board's two rooms into one team match with names and margin", async () => {
    const db = (await harness.getDb()) as Db;
    const { createSection } = await import(
      "@/db/games/actions/create-section"
    );
    const { materializeSwissTeamsRound } = await import(
      "@/services/materialize-swiss-teams-round"
    );
    const { buildTeamTravellerMatches } = await import(
      "@/services/board-service"
    );

    await createSection(harness.gameId, { section: "A", tables: 2 });
    // Teams 1 v 2, round 1, 1 board.
    await materializeSwissTeamsRound(
      harness.gameId,
      "A",
      1,
      1,
      5,
      [{ a: 1, b: 2 }],
      null,
      null,
    );

    // Open room (team 1 home, table 1): 4H by N making = +620.
    // Closed room (team 2 home, table 2): 3NT by N making = +400.
    await setResult(db, 1, 1, "4HN=");
    await setResult(db, 2, 1, "3NTN=");

    const matchesOut = await buildTeamTravellerMatches(db, 1);

    expect(matchesOut).toHaveLength(1);
    const m = matchesOut[0];
    expect(m.tables).toEqual([1, 2]);
    expect(m.teams.map((t) => t.id)).toEqual(["A1NS", "A2NS"]);
    // 620 − 400 → a positive IMP margin for the home team.
    expect(typeof m.margin).toBe("number");
    expect(m.margin!).toBeGreaterThan(0);
  });

  it("reports a null margin when a room has no comparable result yet", async () => {
    const db = (await harness.getDb()) as Db;
    const { createSection } = await import(
      "@/db/games/actions/create-section"
    );
    const { materializeSwissTeamsRound } = await import(
      "@/services/materialize-swiss-teams-round"
    );
    const { buildTeamTravellerMatches } = await import(
      "@/services/board-service"
    );

    await createSection(harness.gameId, { section: "A", tables: 2 });
    await materializeSwissTeamsRound(
      harness.gameId,
      "A",
      1,
      1,
      5,
      [{ a: 1, b: 2 }],
      null,
      null,
    );

    // Only the open room has a result; the closed room is unplayed.
    await setResult(db, 1, 1, "4HN=");

    const matchesOut = await buildTeamTravellerMatches(db, 1);
    expect(matchesOut).toHaveLength(1);
    expect(matchesOut[0].margin).toBeNull();
    // Falls back to the raw team id when the team name isn't resolved.
    expect(matchesOut[0].teams[0].name).toBe("A1NS");
  });

  it("frames each SHORT-triple board set as its own two-team card", async () => {
    const db = (await harness.getDb()) as Db;
    const { createSection } = await import(
      "@/db/games/actions/create-section"
    );
    const { materializeSwissTeamsRound } = await import(
      "@/services/materialize-swiss-teams-round"
    );
    const { buildTeamTravellerMatches } = await import(
      "@/services/board-service"
    );
    const { matches } = await import("@/db/games/tables/matches");

    await createSection(harness.gameId, { section: "A", tables: 3 });
    // A SHORT triple {1,2,3} over 4 boards/round.
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

    // Find a board that belongs to a TRIPLE comparison and frame it: it must
    // yield exactly one two-team card (that comparison), never a three-way.
    const tripleMatch = (
      await db.select().from(matches)
    ).find((mm) => mm.kind === "TRIPLE")!;
    const board = tripleMatch.boardStart;

    const framed = await buildTeamTravellerMatches(db, board);
    expect(framed).toHaveLength(1);
    expect(framed[0].teams).toHaveLength(2);
  });

  it("returns an empty array for a board with no rows", async () => {
    const db = (await harness.getDb()) as Db;
    const { buildTeamTravellerMatches } = await import(
      "@/services/board-service"
    );
    expect(await buildTeamTravellerMatches(db, 99)).toEqual([]);
  });

  it("returns an empty array for a pairs board (no teams match)", async () => {
    const db = (await harness.getDb()) as Db;
    const { createSection } = await import(
      "@/db/games/actions/create-section"
    );
    const { materializeSwissRound } = await import(
      "@/services/materialize-swiss-round"
    );
    const { buildTeamTravellerMatches } = await import(
      "@/services/board-service"
    );

    await createSection(harness.gameId, { section: "A", tables: 1 });
    await materializeSwissRound(
      harness.gameId,
      "A",
      1,
      1,
      1,
      [{ tableNumber: 1, ns: 1, ew: 2 }],
      null,
    );

    // A Swiss PAIRS board belongs to a PAIRS match, not TEAMS/TRIPLE, so the
    // team framing is empty (the traveller renders plain pair rows).
    expect(await buildTeamTravellerMatches(db, 1)).toEqual([]);
  });
});
