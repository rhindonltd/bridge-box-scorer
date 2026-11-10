// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import { makeBoard, seedFixtureMatch } from "@/mocks/fixtures/db-rows";
import type { BoardOutcome } from "@/model/score";

describe("findGameRoster (design §11)", () => {
  let harness: DbHarness;

  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
    seedFixtureMatch((await harness.getDb()) as Db);
  });

  afterEach(() => {
    harness.teardown();
  });

  it("lists each seat with its status, attention-needing first", async () => {
    const db = (await harness.getDb()) as Db;
    const { createBoard } = await import("@/db/games/actions/create-board");
    const { players } = await import("@/db/games/tables/players");
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const { expectedLateSeats } =
      await import("@/db/games/tables/expected-late-seats");
    const p = (f: string) =>
      db
        .insert(players)
        .values({ firstName: f, lastName: "X" })
        .returning()
        .get();

    db.insert(seatOccupancy)
      .values({
        seat: "A1NS",
        player1: p("Act1").id,
        player2: p("Act2").id,
        secretKey: "a",
      })
      .run();
    db.insert(seatOccupancy)
      .values({
        seat: "A2NS",
        player1: p("Wyn").id,
        player2: p("Wes").id,
        secretKey: "w",
        standing: "WITHDRAWN",
        withdrawnInRound: 2,
      })
      .run();
    db.insert(expectedLateSeats).values({ seat: "A3EW" }).run();

    // Give the withdrawn + empty seats a missed board each.
    await createBoard(
      harness.gameId,
      makeBoard({
        roundNumber: 1,
        boardNumber: 1,
        status: "CONFIRMED",
        confirmedResult: "3NTN=" as BoardOutcome,
      }),
    );
    await createBoard(
      harness.gameId,
      makeBoard({
        roundNumber: 2,
        boardNumber: 2,
        tableNumber: 2,
        ns: "A2NS",
        ew: "A2EW",
        status: "ABSENT",
      }),
    );
    await createBoard(
      harness.gameId,
      makeBoard({
        roundNumber: 1,
        boardNumber: 3,
        tableNumber: 3,
        ns: "A3NS",
        ew: "A3EW",
      }),
    );

    const { findGameRoster } = await import("./find-game-roster");
    const roster = await findGameRoster(db);
    const byseat = Object.fromEntries(roster.map((r) => [r.seat, r.status]));
    expect(byseat).toMatchObject({
      A3EW: "NOT_ARRIVED",
      A2NS: "WITHDRAWN",
      A1NS: "ACTIVE",
    });
    // Attention-needing (not arrived, withdrawn) sort before active.
    expect(roster[roster.length - 1].status).toBe("ACTIVE");
    // The withdrawn entry carries its absence detail for the AVE/Removed choice.
    expect(roster.find((r) => r.seat === "A2NS")!.absence?.kind).toBe(
      "WITHDRAWN",
    );
  });
  it("covers late, substituted and without-standing seats, ordered by status then seat", async () => {
    const db = (await harness.getDb()) as Db;
    const { players } = await import("@/db/games/tables/players");
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const occupy = (
      seat: string,
      tag: string,
      extra: Record<string, unknown> = {},
    ) => {
      const p1 = db
        .insert(players)
        .values({ firstName: tag, lastName: "One" })
        .returning()
        .get();
      const p2 = db
        .insert(players)
        .values({ firstName: tag, lastName: "Two" })
        .returning()
        .get();
      db.insert(seatOccupancy)
        .values({
          seat: seat as never,
          player1: p1.id,
          player2: p2.id,
          secretKey: `k-${tag}`,
          ...extra,
        })
        .run();
    };
    occupy("A6NS", "act2");
    occupy("A1NS", "act1");
    occupy("A2NS", "late", { standing: "LATE", withdrawnInRound: 2 });
    occupy("A3NS", "nostand", { standing: "WITHOUT_STANDING" });
    occupy("A4NS", "early", { boards: [1] });
    occupy("A4NS", "later", { boards: [2] });
    const { findGameRoster } = await import("./find-game-roster");
    const roster = await findGameRoster(db);
    expect(roster.map((r) => [r.seat, r.status])).toEqual([
      ["A2NS", "LATE"],
      ["A4NS", "SUBSTITUTED"],
      ["A3NS", "WITHOUT_STANDING"],
      ["A1NS", "ACTIVE"],
      ["A6NS", "ACTIVE"],
    ]);
    const sub = roster.find((r) => r.seat === "A4NS")!;
    expect(sub.substitution).toBeDefined();
    expect(sub.pair).toBe(sub.substitution!.pair);
    expect(roster.find((r) => r.seat === "A1NS")!.absence).toBeUndefined();
  });
});
