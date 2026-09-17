// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import type { BridgeGame } from "@/db/game-index/schema";
import type { Club } from "@/db/system/schema";
import type { PairSeat } from "@/model/participants";

const club: Club = { id: 1, name: "Test Bridge Club", clubNumber: "12345" };

const game: BridgeGame = {
  gameId: "abc123",
  eventName: "Monday Pairs",
  director: "Jacqui",
  gameType: "PAIRS",
  scoringType: "MP",
  sessionName: "1",
  sectionName: "A",
  eventDate: "2024-11-18T00:00:00.000Z",
  tables: 1,
  selectedMovement: null,
  leadCardRequired: true,
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

    const ranks = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
    await upsertDeal(db, 1, {
      N: ranks.map((r) => `${r}S`),
      E: ranks.map((r) => `${r}H`),
      S: ranks.map((r) => `${r}D`),
      W: ranks.map((r) => `${r}C`),
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
    });
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

  it("emits a SWISS_TEAMS file for a Swiss Teams game", async () => {
    // Two teams (home tables 1 and 2), each a full NS+EW pair, playing one
    // board against each other in both rooms.
    await seatPair("A1NS", "H1");
    await seatPair("A1EW", "A1");
    await seatPair("A2NS", "H2");
    await seatPair("A2EW", "A2");
    await makeBoard(1, 1, 1, "A1NS", "A2EW", "4SN=");
    await makeBoard(1, 2, 1, "A2NS", "A1EW", "3NTN=");

    const teamsGame: BridgeGame = {
      ...game,
      gameType: "TEAMS",
      scoringType: "IMP",
      selectedMovement: JSON.stringify({
        source: "SWISS_TEAMS",
        swissTeams: { teams: 2, rounds: 1, boardsPerRound: 1 },
      }),
    };

    const { generateUsebio } = await import("@/services/usebio-service");
    const db = (await harness.getDb()) as Db;

    const xml = await generateUsebio(db, teamsGame, club);

    expect(xml).toContain('<EVENT EVENT_TYPE="SWISS_TEAMS">');
    expect(xml).toContain("<MATCH_SCORING_METHOD>VPS</MATCH_SCORING_METHOD>");
    expect(xml).toContain('TEAM_NAME="N"'); // North surname fallback (attribute)
    expect(xml).toContain("<TEAM>1</TEAM>");
    expect(xml).toContain("<OPPOSING_TEAM>2</OPPOSING_TEAM>");
  });
});
