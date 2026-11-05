// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import { makeBoard, seedFixtureMatch } from "@/mocks/fixtures/db-rows";
import type { BoardOutcome } from "@/model/score";

describe("reinstatePair (design §11)", () => {
  let harness: DbHarness;

  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
    seedFixtureMatch((await harness.getDb()) as Db);
  });

  afterEach(() => {
    harness.teardown();
  });

  async function withdrawnSeat() {
    const db = (await harness.getDb()) as Db;
    const { createBoard } = await import("@/db/games/actions/create-board");
    const { players } = await import("@/db/games/tables/players");
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const p1 = db
      .insert(players)
      .values({ firstName: "A", lastName: "X" })
      .returning()
      .get();
    const p2 = db
      .insert(players)
      .values({ firstName: "B", lastName: "X" })
      .returning()
      .get();
    db.insert(seatOccupancy)
      .values({
        seat: "A1NS",
        player1: p1.id,
        player2: p2.id,
        secretKey: "k",
        standing: "WITHDRAWN",
        withdrawnInRound: 2,
        withdrawalTreatment: "AVERAGE",
      })
      .run();
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
      makeBoard({ roundNumber: 2, boardNumber: 2, status: "ABSENT" }),
    );
    await createBoard(
      harness.gameId,
      makeBoard({ roundNumber: 3, boardNumber: 3, status: "ABSENT" }),
    );
    return db;
  }

  it("sets the pair ACTIVE and un-marks its ABSENT boards", async () => {
    const db = await withdrawnSeat();
    const { reinstatePair } = await import("./reinstate-pair");
    expect(await reinstatePair(harness.gameId, "A1NS", "fresh-token")).toEqual({ ok: true });

    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const occ = db.select().from(seatOccupancy).get()!;
    expect(occ.standing).toBe("ACTIVE");
    expect(occ.withdrawnInRound).toBeNull();
    expect(occ.withdrawalTreatment).toBeNull();
    expect(occ.secretKey).toBe("fresh-token");

    const { boards } = await import("@/db/games/tables/boards");
    const rows = await db.select().from(boards);
    expect(rows.find((r) => r.boardNumber === 1)!.status).toBe("CONFIRMED");
    expect(rows.find((r) => r.boardNumber === 2)!.status).toBe("NOT_PLAYED");
    expect(rows.find((r) => r.boardNumber === 3)!.status).toBe("NOT_PLAYED");
  });

  it("rejects a pair that has not withdrawn", async () => {
    const db = (await harness.getDb()) as Db;
    const { players } = await import("@/db/games/tables/players");
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const p1 = db
      .insert(players)
      .values({ firstName: "A", lastName: "X" })
      .returning()
      .get();
    const p2 = db
      .insert(players)
      .values({ firstName: "B", lastName: "X" })
      .returning()
      .get();
    db.insert(seatOccupancy)
      .values({ seat: "A1NS", player1: p1.id, player2: p2.id, secretKey: "k" })
      .run();
    const { reinstatePair } = await import("./reinstate-pair");
    const result = await reinstatePair(harness.gameId, "A1NS", "k");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/not withdrawn/);
  });

  it("rejects an empty seat", async () => {
    await withdrawnSeat();
    const { reinstatePair } = await import("./reinstate-pair");
    expect((await reinstatePair(harness.gameId, "A9NS", "k")).ok).toBe(false);
  });
});
