// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import {
  makeBoard,
  makeSubmission,
  seedFixtureMatch,
} from "@/mocks/fixtures/db-rows";
import type { BoardOutcome } from "@/model/score";

describe("recordWithdrawal (design §11)", () => {
  let harness: DbHarness;

  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
    seedFixtureMatch((await harness.getDb()) as Db);
  });

  afterEach(() => {
    harness.teardown();
  });

  async function seat(db: Db, seatId: string) {
    const { players } = await import("@/db/games/tables/players");
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const p1 = db
      .insert(players)
      .values({ firstName: "A", lastName: seatId })
      .returning()
      .get();
    const p2 = db
      .insert(players)
      .values({ firstName: "B", lastName: seatId })
      .returning()
      .get();
    db.insert(seatOccupancy)
      .values({
        seat: seatId as never,
        player1: p1.id,
        player2: p2.id,
        secretKey: seatId,
      })
      .run();
  }

  async function setup() {
    const db = (await harness.getDb()) as Db;
    const { createBoard } = await import("@/db/games/actions/create-board");
    await seat(db, "A1NS");
    await seat(db, "A1EW");
    // Round 1 board 1 scored; round 2 boards 2–3 not yet; round 3 board 4 not yet.
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
        status: "CONFIRMED",
        confirmedResult: "4SN=" as BoardOutcome,
      }),
    );
    await createBoard(
      harness.gameId,
      makeBoard({ roundNumber: 2, boardNumber: 3 }),
    );
    await createBoard(
      harness.gameId,
      makeBoard({ roundNumber: 3, boardNumber: 4 }),
    );
    return db;
  }

  async function rowStatuses(db: Db) {
    const { boards } = await import("@/db/games/tables/boards");
    const rows = await db.select().from(boards);
    return Object.fromEntries(rows.map((r) => [r.boardNumber, r.status]));
  }

  it("marks the seat WITHDRAWN and its unscored boards from the round on ABSENT", async () => {
    const db = await setup();
    const { recordWithdrawal } = await import("./record-withdrawal");
    const result = await recordWithdrawal(harness.gameId, "A1NS", 2);
    expect(result).toEqual({ ok: true, absentBoards: 2 });

    expect(await rowStatuses(db)).toEqual({
      1: "CONFIRMED",
      2: "CONFIRMED",
      3: "ABSENT",
      4: "ABSENT",
    });

    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const { eq } = await import("drizzle-orm");
    const occ = db
      .select()
      .from(seatOccupancy)
      .where(eq(seatOccupancy.seat, "A1NS"))
      .get()!;
    expect(occ.standing).toBe("WITHDRAWN");
    expect(occ.withdrawnInRound).toBe(2);
  });

  it("discards a pending submission on the boards it will not play", async () => {
    const db = await setup();
    const { boardSubmissions } = await import("@/db/games/tables/submissions");
    db.insert(boardSubmissions)
      .values(
        makeSubmission({
          roundNumber: 2,
          boardNumber: 3,
          side: "EW",
          result: "3NTN=" as BoardOutcome,
        }),
      )
      .run();
    const { recordWithdrawal } = await import("./record-withdrawal");
    await recordWithdrawal(harness.gameId, "A1NS", 2);
    expect(await db.select().from(boardSubmissions)).toEqual([]);
  });

  it("rejects a second withdrawal", async () => {
    await setup();
    const { recordWithdrawal } = await import("./record-withdrawal");
    await recordWithdrawal(harness.gameId, "A1NS", 2);
    expect(await recordWithdrawal(harness.gameId, "A1NS", 3)).toEqual({
      ok: false,
      error: "This pair has already withdrawn.",
    });
  });

  it("rejects when nothing is left to play", async () => {
    await setup();
    const { recordWithdrawal } = await import("./record-withdrawal");
    const result = await recordWithdrawal(harness.gameId, "A1NS", 9);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/no boards left/);
  });

  it("rejects an empty seat", async () => {
    await setup();
    const { recordWithdrawal } = await import("./record-withdrawal");
    expect((await recordWithdrawal(harness.gameId, "A9NS", 1)).ok).toBe(false);
  });
});
