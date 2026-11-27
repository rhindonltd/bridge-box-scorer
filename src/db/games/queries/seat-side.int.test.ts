// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import type { PairSeat } from "@/model/participants";
import { boards } from "@/db/games/tables/boards";
import { matches } from "@/db/games/tables/matches";

describe("seatSideAtBoard", () => {
  let harness: DbHarness;

  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
  });

  afterEach(() => {
    harness.teardown();
  });

  async function seatPair(seat: string) {
    const { createPlayer } = await import("@/db/games/actions/create-player");
    const { createParticipant } =
      await import("@/db/games/actions/create-participant");
    const p1 = await createPlayer(harness.gameId, {
      firstName: "Alice",
      lastName: "Adams",
    });
    const p2 = await createPlayer(harness.gameId, {
      firstName: "Bob",
      lastName: "Brown",
    });
    await createParticipant(harness.gameId, {
      type: "PAIR",
      initialSeat: seat as PairSeat,
      player1: p1.id,
      player2: p2.id,
      secretKey: `secret-${seat}`,
    } as never);
  }

  it("reads the side from where the pair's id sits on the board row", async () => {
    const db = (await harness.getDb()) as Db;
    const { seatSideAtBoard } = await import("@/db/games/queries/seat-side");
    await seatPair("A1NS");
    await seatPair("A2NS");
    await seatPair("A2EW");
    const matchId = Number(
      db
        .insert(matches)
        .values({
          section: "A",
          roundNumber: 2,
          kind: "TEAMS",
          scoredAsUnit: true,
          home: "A1NS",
          opponent: "A2NS",
          boardStart: 13,
          boardEnd: 13,
        })
        .run().lastInsertRowid,
    );
    // A head-to-head's second stanza: team 2's North/South pair sits
    // East/West at table 1.
    db.insert(boards)
      .values({
        section: "A",
        roundNumber: 2,
        tableNumber: 1,
        boardNumber: 13,
        ns: "A1NS",
        ew: "A2NS",
        matchId,
      })
      .run();
    const where = {
      section: "A",
      roundNumber: 2,
      tableNumber: 1,
      boardNumber: 13,
    };

    expect(await seatSideAtBoard(db, "A1NS", where)).toBe("NS");
    expect(await seatSideAtBoard(db, "A2NS", where)).toBe("EW");
    // Seated, but not at this board.
    expect(await seatSideAtBoard(db, "A2EW", where)).toBeNull();
    // No such board.
    expect(
      await seatSideAtBoard(db, "A1NS", { ...where, boardNumber: 99 }),
    ).toBeNull();
    // An empty seat.
    expect(await seatSideAtBoard(db, "A3NS", where)).toBeNull();
  });
});
