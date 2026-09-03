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
    expect(xml).toContain('<BOARD BOARD_NUMBER="1">');
  });

  it("produces valid XML even with no pairs or boards", async () => {
    const { generateUsebio } = await import("@/services/usebio-service");
    const db = (await harness.getDb()) as Db;

    const xml = await generateUsebio(db, game, club);
    expect(xml).toContain("<USEBIO");
    expect(xml).toMatch(/PARTICIPANTS/);
  });
});
