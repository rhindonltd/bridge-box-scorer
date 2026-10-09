// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import type { PairSeat } from "@/model/participants";

/**
 * Integration coverage for the players + participants slice of the per-game
 * database: createPlayer, createParticipant, deleteParticipant, and the
 * findPairs / findPairForPlayerId queries, against a real migrated SQLite file.
 */
describe("games db: players and participants", () => {
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
    const { createParticipant } = await import(
      "@/db/games/actions/create-participant"
    );

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
      secretKey: "k",
    } as never);

    return { p1, p2 };
  }

  it("creates a player and returns the inserted row with an id", async () => {
    const { createPlayer } = await import("@/db/games/actions/create-player");

    const player = await createPlayer(harness.gameId, {
      firstName: "Carol",
      lastName: "Clark",
    });

    expect(player.id).toBeGreaterThan(0);
    expect(player).toMatchObject({ firstName: "Carol", lastName: "Clark" });
  });

  it("finds a seated pair via findPairs with joined player names", async () => {
    await seatPair("A1NS");

    const { findPairs } = await import("@/db/games/queries/find-pairs");
    const db = (await harness.getDb()) as Db;

    const pairs = await findPairs(db);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toMatchObject({
      type: "PAIR",
      initialSeat: "A1NS",
      player1: { firstName: "Alice", lastName: "Adams" },
      player2: { firstName: "Bob", lastName: "Brown" },
    });
  });

  it("finds the participant for either seated player id", async () => {
    const { p1, p2 } = await seatPair("A2NS");

    const { findPairForPlayerId } = await import(
      "@/db/games/queries/find-pair-for-player-id"
    );

    const byP1 = await findPairForPlayerId(harness.gameId, p1.id);
    const byP2 = await findPairForPlayerId(harness.gameId, p2.id);

    expect(byP1?.initialSeat).toBe("A2NS");
    expect(byP2?.initialSeat).toBe("A2NS");
  });

  it("returns undefined when no participant matches the player id", async () => {
    const { findPairForPlayerId } = await import(
      "@/db/games/queries/find-pair-for-player-id"
    );

    const result = await findPairForPlayerId(harness.gameId, 9999);
    expect(result).toBeUndefined();
  });

  it("deletes a participant and both of their player rows", async () => {
    const { p1, p2 } = await seatPair("A3NS");

    const { deleteParticipant } = await import(
      "@/db/games/actions/delete-participant"
    );
    const { findPairs } = await import("@/db/games/queries/find-pairs");
    const db = (await harness.getDb()) as Db;

    await deleteParticipant(harness.gameId, "A3NS" as PairSeat);

    expect(await findPairs(db)).toHaveLength(0);

    // The two player rows are gone too.
    const { players } = await import("@/db/games/tables/players");
    const remaining = db.select().from(players).all();
    const remainingIds = remaining.map((r) => r.id);
    expect(remainingIds).not.toContain(p1.id);
    expect(remainingIds).not.toContain(p2.id);
  });

  it("is a no-op when deleting a participant that does not exist", async () => {
    const { deleteParticipant } = await import(
      "@/db/games/actions/delete-participant"
    );
    await expect(
      deleteParticipant(harness.gameId, "Z9NS" as PairSeat),
    ).resolves.toBeUndefined();
  });

  it("a freshly seated participant defaults to ACTIVE standing", async () => {
    await seatPair("A4NS");
    const db = (await harness.getDb()) as Db;
    const { participants } = await import("@/db/games/tables/participants");
    const row = db.select().from(participants).all()[0];
    expect(row.standing).toBe("ACTIVE");
    expect(row.withdrawnInRound).toBeNull();
    expect(row.withdrawalTreatment).toBeNull();
    expect(row.withdrawalFinePercent).toBeNull();
  });

  it("withdraws a participant (PENALISED) without deleting any rows", async () => {
    const { p1, p2 } = await seatPair("A5NS");
    const { withdrawParticipant } = await import(
      "@/db/games/actions/withdraw-participant"
    );
    const db = (await harness.getDb()) as Db;

    const ok = await withdrawParticipant(harness.gameId, "A5NS", {
      standing: "WITHDRAWN",
      withdrawnInRound: 3,
      treatment: "PENALISED",
      finePercent: 20,
    });
    expect(ok).toBe(true);

    const { participants } = await import("@/db/games/tables/participants");
    const { players } = await import("@/db/games/tables/players");
    const row = db.select().from(participants).all()[0];
    expect(row.standing).toBe("WITHDRAWN");
    expect(row.withdrawnInRound).toBe(3);
    expect(row.withdrawalTreatment).toBe("PENALISED");
    expect(row.withdrawalFinePercent).toBe(20);
    // The participant and BOTH player rows survive (unlike eviction).
    const remainingIds = db.select().from(players).all().map((r) => r.id);
    expect(remainingIds).toContain(p1.id);
    expect(remainingIds).toContain(p2.id);
  });

  it("clamps the §2.4.5 fine into 0..40 and clears it for REMOVE", async () => {
    await seatPair("A6NS");
    const { withdrawParticipant } = await import(
      "@/db/games/actions/withdraw-participant"
    );
    const { participants } = await import("@/db/games/tables/participants");
    const db = (await harness.getDb()) as Db;

    // Over-max fine is clamped to 40.
    await withdrawParticipant(harness.gameId, "A6NS", {
      standing: "WITHDRAWN",
      withdrawnInRound: 2,
      treatment: "PENALISED",
      finePercent: 99,
    });
    expect(db.select().from(participants).all()[0].withdrawalFinePercent).toBe(40);

    // REMOVE carries no fine, even if a stale one was set before.
    await withdrawParticipant(harness.gameId, "A6NS", {
      standing: "WITHDRAWN",
      withdrawnInRound: 2,
      treatment: "REMOVE",
    });
    const removed = db.select().from(participants).all()[0];
    expect(removed.withdrawalTreatment).toBe("REMOVE");
    expect(removed.withdrawalFinePercent).toBeNull();
  });

  it("marks a WITHOUT_STANDING substitute and clears withdrawal fields", async () => {
    await seatPair("A7NS");
    const { withdrawParticipant } = await import(
      "@/db/games/actions/withdraw-participant"
    );
    const { participants } = await import("@/db/games/tables/participants");
    const db = (await harness.getDb()) as Db;

    // First withdraw, then flip to without-standing: the withdrawal fields clear.
    await withdrawParticipant(harness.gameId, "A7NS", {
      standing: "WITHDRAWN",
      withdrawnInRound: 1,
      treatment: "PENALISED",
      finePercent: 10,
    });
    await withdrawParticipant(harness.gameId, "A7NS", {
      standing: "WITHOUT_STANDING",
    });
    const row = db.select().from(participants).all()[0];
    expect(row.standing).toBe("WITHOUT_STANDING");
    expect(row.withdrawnInRound).toBeNull();
    expect(row.withdrawalTreatment).toBeNull();
    expect(row.withdrawalFinePercent).toBeNull();
  });

  it("is a no-op (false) withdrawing a participant that does not exist", async () => {
    const { withdrawParticipant } = await import(
      "@/db/games/actions/withdraw-participant"
    );
    const ok = await withdrawParticipant(harness.gameId, "Z9NS", {
      standing: "WITHDRAWN",
      withdrawnInRound: 1,
      treatment: "REMOVE",
    });
    expect(ok).toBe(false);
  });
});
