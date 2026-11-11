// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { eq } from "drizzle-orm";
import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import { seedFixtureMatch } from "@/mocks/fixtures/db-rows";
import { isSamePair } from "@/db/games/actions/handover-seat";
/**
 * Edge cases of the §2.4.7 handover action that the main handover tests don't
 * reach: legacy whole-seat occupancies on both sides of a return, and the
 * partial-pair guard in isSamePair.
 */
describe("isSamePair", () => {
  const a = { firstName: "A", lastName: "One" };
  const b = { firstName: "B", lastName: "Two" };
  it("never matches a recorded side with a missing player", () => {
    expect(
      isSamePair({ player1: a, player2: b }, { player1: a, player2: undefined }),
    ).toBe(false);
    expect(
      isSamePair({ player1: a, player2: b }, { player1: undefined, player2: b }),
    ).toBe(false);
  });
  it("matches either seat order", () => {
    expect(
      isSamePair({ player1: b, player2: a }, { player1: a, player2: b }),
    ).toBe(true);
  });
});
describe("handoverSeat — return between two whole-seat occupancies", () => {
  let harness: DbHarness;
  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
    seedFixtureMatch((await harness.getDb()) as Db);
  });
  afterEach(() => {
    harness.teardown();
  });
  it("returns the earlier pair even when neither occupancy has a board list", async () => {
    const db = (await harness.getDb()) as Db;
    const { players } = await import("@/db/games/tables/players");
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const { boards } = await import("@/db/games/tables/boards");
    const { makeBoard } = await import("@/mocks/fixtures/db-rows");
    const seat = (first: string) => {
      const p1 = db
        .insert(players)
        .values({ firstName: `${first}1`, lastName: "X" })
        .returning()
        .get();
      const p2 = db
        .insert(players)
        .values({ firstName: `${first}2`, lastName: "X" })
        .returning()
        .get();
      return db
        .insert(seatOccupancy)
        .values({
          seat: "A1NS",
          boards: null,
          player1: p1.id,
          player2: p2.id,
          secretKey: `${first}-secret`,
        })
        .returning()
        .get().id;
    };
    const firstId = seat("First");
    const secondId = seat("Second");
    db.insert(boards)
      .values([
        makeBoard({ boardNumber: 1, roundNumber: 1 }),
        makeBoard({ boardNumber: 2, roundNumber: 2 }),
      ])
      .run();
    const { handoverSeat } = await import("@/db/games/actions/handover-seat");
    const result = await handoverSeat(harness.gameId, {
      seat: "A1NS",
      realPair: {
        player1: { firstName: "Second1", lastName: "X" },
        player2: { firstName: "Second2", lastName: "X" },
      },
      secretKey: "new-secret",
    });
    expect(result.ok).toBe(true);
    const rows = db
      .select()
      .from(seatOccupancy)
      .where(eq(seatOccupancy.seat, "A1NS"))
      .all();
    // Nothing was played, so the leaving pair collapses away and the returning
    // pair is the single whole-seat occupant again.
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: secondId, secretKey: "new-secret" });
    expect(rows.some((r) => r.id === firstId)).toBe(false);
  });
});
