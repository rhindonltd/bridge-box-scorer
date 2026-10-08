// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import type { BridgeGame } from "@/db/game-index/schema";
import type { Club } from "@/db/system/schema";
import type { PairSeat } from "@/model/participants";
import type { Card, Rank } from "@/model/common";
import { FIXTURE_MATCH_ID, seedFixtureMatch } from "@/mocks/fixtures/db-rows";

const club: Club = { id: 1, name: "Test Bridge Club", clubNumber: "12345" };

const game: BridgeGame = {
  gameId: "abc123",
  eventName: "Monday Pairs",
  director: "Jacqui",
  gameType: "PAIRS",
  eventFormat: "STANDARD",
  scoringType: "MP",
  combinedRanking: true,
  sectionName: "A",
  eventDate: "2024-11-18T00:00:00.000Z",
  tables: 1,
  selectedMovement: null,
  bridgewebsEventId: null,
  leadCardRequired: true,
  handEntryEnabled: false,
  createdAt: "2024-11-18 00:00:00",
  updatedAt: "2024-11-18 00:00:00",
};

/**
 * Integration coverage for generateUsebio: it reads seated pairs and boards
 * from a real per-game DB and produces USEBIO XML reflecting that data.
 */
describe("generateUsebio", () => {
  let harness: DbHarness;

  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
    seedFixtureMatch((await harness.getDb()) as Db);
  });

  afterEach(() => {
    harness.teardown();
  });

  async function seedPairAndBoard() {
    const { createPlayer } = await import("@/db/games/actions/create-player");
    const { createParticipant } = await import(
      "@/db/games/actions/create-participant"
    );
    const { createBoard } = await import("@/db/games/actions/create-board");

    const p1 = await createPlayer(harness.gameId, {
      firstName: "Alice",
      lastName: "Smith",
    });
    const p2 = await createPlayer(harness.gameId, {
      firstName: "Bob",
      lastName: "Jones",
    });
    await createParticipant(harness.gameId, {
      type: "PAIR",
      initialSeat: "A1NS" as PairSeat,
      player1: p1.id,
      player2: p2.id,
      secretKey: "k",
    } as never);

    await createBoard(harness.gameId, {
      section: "A",
      roundNumber: 1,
      tableNumber: 1,
      boardNumber: 1,
      copy: "A",
      ns: "A1NS",
      ew: "A1EW",
      status: "CONFIRMED",
      confirmedResult: "3NTN=",
      matchId: FIXTURE_MATCH_ID,
    });
  }

  it("emits USEBIO XML with club, event and seated pair data from the DB", async () => {
    await seedPairAndBoard();

    const { generateUsebio } = await import("@/services/usebio-service");
    const db = (await harness.getDb()) as Db;

    const xml = await generateUsebio(db, game, club);

    expect(xml).toContain('<USEBIO Version="1.2">');
    expect(xml).toContain("<CLUB_NAME>Test Bridge Club</CLUB_NAME>");
    expect(xml).toContain("<EVENT_DESCRIPTION>Monday Pairs</EVENT_DESCRIPTION>");
    expect(xml).toContain("<PLAYER_NAME>Alice Smith</PLAYER_NAME>");
    expect(xml).toContain("<BOARD_NUMBER>1</BOARD_NUMBER>");
  });

  it("produces valid XML even with no pairs or boards", async () => {
    const { generateUsebio } = await import("@/services/usebio-service");
    const db = (await harness.getDb()) as Db;

    const xml = await generateUsebio(db, game, club);
    expect(xml).toContain("<USEBIO");
    expect(xml).toMatch(/PARTICIPANTS/);
  });

  it("excludes an entered board deal from the export (deals go to the PBN file)", async () => {
    await seedPairAndBoard();

    const { upsertDeal } = await import("@/db/games/actions/set-deal");
    const db = (await harness.getDb()) as Db;

    const ranks: Rank[] = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
    await upsertDeal(db, 1, {
      N: ranks.map((r): Card => `S${r}`),
      E: ranks.map((r): Card => `H${r}`),
      S: ranks.map((r): Card => `D${r}`),
      W: ranks.map((r): Card => `C${r}`),
    });

    const { generateUsebio } = await import("@/services/usebio-service");
    const xml = await generateUsebio(db, game, club);

    // Even though a deal is stored for board 1, the USEBIO export carries only
    // players and results. The dealt cards / vulnerability are exported
    // separately as a PBN file (BridgeWebs takes both files).
    expect(xml).not.toContain("<VULNERABILITY>");
    expect(xml).not.toContain("<HAND>");
    expect(xml).not.toContain("<SPADES>");
    expect(xml).not.toContain("<CLUBS>");
  });

  it("emits one SECTION per section with unprefixed pair numbers", async () => {
    const { createSection } = await import(
      "@/db/games/actions/create-section"
    );
    const { createBoard } = await import("@/db/games/actions/create-board");

    // Two sections, each with a seated NS/EW pair playing board 1.
    await createSection(harness.gameId, { section: "A", tables: 1 });
    await createSection(harness.gameId, { section: "B", tables: 1 });

    await seatPair("A1NS", "Alice");
    await seatPair("A1EW", "Cara");
    await seatPair("B1NS", "Bob");
    await seatPair("B1EW", "Dana");

    for (const section of ["A", "B"] as const) {
      await createBoard(harness.gameId, {
        section,
        roundNumber: 1,
        tableNumber: 1,
        boardNumber: 1,
        copy: "A",
        ns: `${section}1NS`,
        ew: `${section}1EW`,
        status: "CONFIRMED",
        confirmedResult: "3NTN=",
        matchId: FIXTURE_MATCH_ID,
      });
    }

    const { generateUsebio } = await import("@/services/usebio-service");
    const db = (await harness.getDb()) as Db;
    const xml = await generateUsebio(db, game, club);

    // Two SECTION elements under one SESSION, and the right count.
    expect(xml).toContain("<SECTION_COUNT>2</SECTION_COUNT>");
    expect(xml).toContain('<SECTION SECTION_ID="A">');
    expect(xml).toContain('<SECTION SECTION_ID="B">');

    // Pair numbers are UNPREFIXED — no "A1NS"/"B1NS" anywhere.
    expect(xml).toContain("<PAIR_NUMBER>1NS</PAIR_NUMBER>");
    expect(xml).toContain("<PAIR_NUMBER>1EW</PAIR_NUMBER>");
    expect(xml).not.toContain("A1NS");
    expect(xml).not.toContain("B1NS");

    // Each pair sits under its own section, with players kept separate.
    const sectionA = xml.split('SECTION_ID="A"')[1].split('SECTION_ID="B"')[0];
    const sectionB = xml.split('SECTION_ID="B"')[1];
    expect(sectionA).toContain("Alice");
    expect(sectionA).not.toContain("Bob");
    expect(sectionB).toContain("Bob");
    expect(sectionB).not.toContain("Alice");
  });

  async function seatPair(seat: string, first: string) {
    const { createPlayer } = await import("@/db/games/actions/create-player");
    const { createParticipant } = await import(
      "@/db/games/actions/create-participant"
    );
    const p1 = await createPlayer(harness.gameId, {
      firstName: first,
      lastName: "N",
    });
    const p2 = await createPlayer(harness.gameId, {
      firstName: first,
      lastName: "S",
    });
    await createParticipant(harness.gameId, {
      type: "PAIR",
      initialSeat: seat as PairSeat,
      player1: p1.id,
      player2: p2.id,
      secretKey: seat,
    } as never);
  }

  async function makeBoard(
    round: number,
    table: number,
    boardNumber: number,
    ns: string,
    ew: string,
    result: string,
  ) {
    const { createBoard } = await import("@/db/games/actions/create-board");
    await createBoard(harness.gameId, {
      section: "A",
      roundNumber: round,
      tableNumber: table,
      boardNumber,
      copy: "A",
      ns,
      ew,
      status: "CONFIRMED",
      confirmedResult: result as never,
      matchId: FIXTURE_MATCH_ID,
    });
  }

  /**
   * Replace the section's `matches` rows with the given teams structure, then
   * repoint each board at the match whose two team tables and board span cover
   * it. Lets a teams usebio case seed its real TEAMS/TRIPLE match rows after
   * laying down the board rows (which the beforeEach stamps with the placeholder
   * match id).
   */
  async function setTeamsStructure(
    db: Db,
    rows: {
      id: number;
      kind: "TEAMS" | "TRIPLE";
      home: string;
      opponent: string;
      vpPool: number;
      boardStart: number;
      boardEnd: number;
      groupId?: string;
    }[],
  ) {
    const { matches } = await import("@/db/games/tables/matches");
    const { boards } = await import("@/db/games/tables/boards");
    const { and, eq, notInArray } = await import("drizzle-orm");
    const { parseSeat } = await import("@/model/participants");

    // Insert the new rows first (boards still reference the placeholder, so we
    // can't delete it yet without violating the FK). Repoint boards, THEN drop
    // any match no board references.
    for (const r of rows) {
      await db.insert(matches).values({
        id: r.id,
        section: "A",
        roundNumber: 1,
        kind: r.kind,
        scoredAsUnit: true,
        home: r.home,
        opponent: r.opponent,
        groupId: r.groupId ?? null,
        vpPool: r.vpPool,
        boardStart: r.boardStart,
        boardEnd: r.boardEnd,
      });
    }

    // Repoint every board at its covering match (two team tables + board span).
    const allBoards = await db.select().from(boards);
    for (const b of allBoards) {
      const nsTable = parseSeat(b.ns).tableNumber;
      let ewTable: number | null = null;
      try {
        ewTable = parseSeat(b.ew).tableNumber;
      } catch {
        ewTable = null;
      }
      const match = rows.find((r) => {
        const lo = parseSeat(r.home).tableNumber;
        const hi = parseSeat(r.opponent).tableNumber;
        const tables = new Set([lo, hi]);
        return (
          b.boardNumber >= r.boardStart &&
          b.boardNumber <= r.boardEnd &&
          tables.has(nsTable) &&
          (ewTable == null || tables.has(ewTable))
        );
      });
      if (match) {
        await db
          .update(boards)
          .set({ matchId: match.id })
          .where(
            and(
              eq(boards.section, b.section),
              eq(boards.tableNumber, b.tableNumber),
              eq(boards.boardNumber, b.boardNumber),
            ),
          );
      }
    }

    // Drop any match (e.g. the beforeEach placeholder) now unreferenced.
    const keepIds = rows.map((r) => r.id);
    await db.delete(matches).where(notInArray(matches.id, keepIds));
  }

  it("emits a SWISS_PAIRS file for a Swiss Pairs game", async () => {
    await seatPair("A1NS", "Al");
    await seatPair("A1EW", "Cy");
    await makeBoard(1, 1, 1, "A1NS", "A1EW", "3NTN=");

    const swissGame: BridgeGame = {
      ...game,
      gameType: "PAIRS",
      scoringType: "IMP",
      selectedMovement: JSON.stringify({
        source: "SWISS",
        swiss: { tables: 1, rounds: 1, boardsPerRound: 1 },
      }),
    };

    const { generateUsebio } = await import("@/services/usebio-service");
    const db = (await harness.getDb()) as Db;

    const xml = await generateUsebio(db, swissGame, club);

    expect(xml).toContain('<EVENT EVENT_TYPE="SWISS_PAIRS">');
    expect(xml).toContain("<MATCH_SCORING_METHOD>VPS</MATCH_SCORING_METHOD>");
    expect(xml).toContain("<NS_PAIR_NUMBER>A1NS</NS_PAIR_NUMBER>");
    expect(xml).toContain("<ROUND_NUMBER>1</ROUND_NUMBER>");
  });

  it("emits a 2-half-matches Swiss round as two anchor matches, no phantom", async () => {
    const { createBoard } = await import("@/db/games/actions/create-board");

    // Odd field of five seated pairs. The half-match group plays at table 1:
    // the anchor A1NS plays A2EW on boards 1-2 (half 1) and A3NS on boards 3-4
    // (half 2); two ordinary field tables play all four boards; the two
    // non-anchors are compensated for the half they miss (HALF_AVERAGE, phantom
    // opponent). The anchor must emit TWO matches and the phantom none.
    for (const seat of ["A1NS", "A2EW", "A3NS", "A2NS", "A3EW"]) {
      await seatPair(seat, seat);
    }

    const confirmed = (
      round: number,
      table: number,
      b: number,
      ns: string,
      ew: string,
      result: string,
    ) =>
      createBoard(harness.gameId, {
        section: "A",
        roundNumber: round,
        tableNumber: table,
        boardNumber: b,
        copy: "A",
        ns,
        ew,
        status: "CONFIRMED",
        confirmedResult: result as never,
        matchId: FIXTURE_MATCH_ID,
      });

    const compensation = (table: number, b: number, ns: string) =>
      createBoard(harness.gameId, {
        section: "A",
        roundNumber: 1,
        tableNumber: table,
        boardNumber: b,
        copy: "A",
        ns,
        ew: "APHANTOM",
        status: "HALF_AVERAGE",
        confirmedResult: null as never,
        matchId: FIXTURE_MATCH_ID,
      });

    // Anchor table 1: half 1 (boards 1-2) vs A2EW, half 2 (boards 3-4) vs A3NS.
    await confirmed(1, 1, 1, "A1NS", "A2EW", "6NTN=");
    await confirmed(1, 1, 2, "A1NS", "A2EW", "6NTN=");
    await confirmed(1, 1, 3, "A1NS", "A3NS", "6NTN=");
    await confirmed(1, 1, 4, "A1NS", "A3NS", "6NTN=");
    // Two ordinary field tables over all four boards.
    for (let b = 1; b <= 4; b++) {
      await confirmed(1, 2, b, "A2NS", "A2EWx", "3NTN=");
      await confirmed(1, 3, b, "A3EW", "A3EWx", "3NTN-1");
    }
    // Compensation: A2EW missed boards 3-4; A3NS missed boards 1-2.
    await compensation(4, 3, "A2EW");
    await compensation(4, 4, "A2EW");
    await compensation(5, 1, "A3NS");
    await compensation(5, 2, "A3NS");

    const swissGame: BridgeGame = {
      ...game,
      gameType: "PAIRS",
      scoringType: "XIMP",
      selectedMovement: JSON.stringify({
        source: "SWISS",
        swiss: {
          tables: 3,
          rounds: 1,
          boardsPerRound: 4,
          oddHandling: "HALF_MATCHES",
          oddRoundPlan: ["HALF_MATCHES"],
        },
      }),
    };

    const { generateUsebio } = await import("@/services/usebio-service");
    const db = (await harness.getDb()) as Db;
    const xml = await generateUsebio(db, swissGame, club);

    expect(xml).toContain('<EVENT EVENT_TYPE="SWISS_PAIRS">');
    // The anchor appears as NS in both of its halves (vs A2EW and vs A3NS).
    const anchorMatches = xml.split("<NS_PAIR_NUMBER>A1NS</NS_PAIR_NUMBER>")
      .length - 1;
    expect(anchorMatches).toBe(2);
    // The phantom opponent is never emitted as a pair in any match.
    expect(xml).not.toContain("APHANTOM");
  });

  it("emits a SWISS_TEAMS file for a Swiss Teams game", async () => {
    // Two teams (home tables 1 and 2), each a full NS+EW pair, playing one
    // board against each other in both rooms.
    await seatPair("A1NS", "H1");
    await seatPair("A1EW", "A1");
    await seatPair("A2NS", "H2");
    await seatPair("A2EW", "A2");
    await makeBoard(1, 1, 1, "A1NS", "A2EW", "4SN=");
    await makeBoard(1, 2, 1, "A2NS", "A1EW", "3NTN=");

    const db = (await harness.getDb()) as Db;
    // The TEAMS scorer reads the first-class match rows: one head-to-head
    // (team 1 v team 2) spanning both rooms' board. The placeholder match from
    // beforeEach is id 1, which every seeded board already points at — repoint
    // it to a TEAMS match.
    await setTeamsStructure(db, [
      { id: 10, kind: "TEAMS", home: "A1NS", opponent: "A2NS", vpPool: 20, boardStart: 1, boardEnd: 1 },
    ]);

    const teamsGame: BridgeGame = {
      ...game,
      gameType: "TEAMS",
      scoringType: "IMP_VP",
      selectedMovement: JSON.stringify({
        source: "SWISS_TEAMS",
        swissTeams: { teams: 2, rounds: 1, boardsPerRound: 1 },
      }),
    };

    const { generateUsebio } = await import("@/services/usebio-service");

    const xml = await generateUsebio(db, teamsGame, club);

    expect(xml).toContain('<EVENT EVENT_TYPE="SWISS_TEAMS">');
    expect(xml).toContain("<MATCH_SCORING_METHOD>VPS</MATCH_SCORING_METHOD>");
    expect(xml).toContain('TEAM_NAME="N"'); // North surname fallback (attribute)
    expect(xml).toContain("<TEAM>1</TEAM>");
    expect(xml).toContain("<OPPOSING_TEAM>2</OPPOSING_TEAM>");
  });

  it("emits a SHORT triple as three head-to-head MATCH nodes", async () => {
    // Three teams (home tables 1,2,3), each a full NS+EW pair, playing a SHORT
    // triple: three head-to-head comparisons on disjoint one-board sets
    //   set A (board 1): 1 v 2, set B (board 2): 2 v 3, set C (board 3): 1 v 3
    // Each comparison is a two-room same-boards match.
    for (const seat of [
      "A1NS",
      "A1EW",
      "A2NS",
      "A2EW",
      "A3NS",
      "A3EW",
    ]) {
      await seatPair(seat, seat);
    }
    // set A board 1 — comparison 1-2
    await makeBoard(1, 1, 1, "A1NS", "A2EW", "4SN=");
    await makeBoard(1, 2, 1, "A2NS", "A1EW", "3NTN=");
    // set B board 2 — comparison 2-3
    await makeBoard(1, 2, 2, "A2NS", "A3EW", "4SN=");
    await makeBoard(1, 3, 2, "A3NS", "A2EW", "3NTN=");
    // set C board 3 — comparison 1-3
    await makeBoard(1, 3, 3, "A3NS", "A1EW", "3NTN=");
    await makeBoard(1, 1, 3, "A1NS", "A3EW", "4SN=");

    const db = (await harness.getDb()) as Db;
    // The three TRIPLE comparison match rows (SHORT ⇒ 10-VP half pool), one per
    // board set; repoint the boards onto them by their team tables + span.
    await setTeamsStructure(db, [
      { id: 10, kind: "TRIPLE", home: "A1NS", opponent: "A2NS", vpPool: 10, boardStart: 1, boardEnd: 1, groupId: "triple|A|1-2-3" },
      { id: 11, kind: "TRIPLE", home: "A2NS", opponent: "A3NS", vpPool: 10, boardStart: 2, boardEnd: 2, groupId: "triple|A|1-2-3" },
      { id: 12, kind: "TRIPLE", home: "A1NS", opponent: "A3NS", vpPool: 10, boardStart: 3, boardEnd: 3, groupId: "triple|A|1-2-3" },
    ]);

    const teamsGame: BridgeGame = {
      ...game,
      gameType: "TEAMS",
      scoringType: "IMP_VP",
      selectedMovement: JSON.stringify({
        source: "SWISS_TEAMS",
        swissTeams: {
          teams: 3,
          rounds: 1,
          boardsPerRound: 2,
          oddHandling: "TRIPLE",
          oddRoundPlan: ["SHORT"],
        },
      }),
    };

    const { generateUsebio } = await import("@/services/usebio-service");

    const xml = await generateUsebio(db, teamsGame, club);

    expect(xml).toContain('<EVENT EVENT_TYPE="SWISS_TEAMS">');
    // Three head-to-head MATCH nodes, one per pairing (1v2, 1v3, 2v3). The
    // comparisons are emitted home-vs-opponent in ascending (lo, hi) order, so
    // opposing-team 3 appears twice (1v3, 2v3) and opposing-team 2 once (1v2).
    const opposing2 = xml.split("<OPPOSING_TEAM>2</OPPOSING_TEAM>").length - 1;
    const opposing3 = xml.split("<OPPOSING_TEAM>3</OPPOSING_TEAM>").length - 1;
    expect(opposing2).toBe(1);
    expect(opposing3).toBe(2);
    // All three teams appear as a match's primary team across the three nodes.
    expect(xml).toContain("<TEAM>1</TEAM>");
    expect(xml).toContain("<TEAM>2</TEAM>");
  });
});
