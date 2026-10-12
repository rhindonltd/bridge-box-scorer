// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { PairSeat } from "@/model/participants";

/**
 * Integration coverage for findParticipantSecret against a real migrated
 * SQLite file: returns the stored secretKey for a seated pair, null for an
 * unknown seat, null when the game database does not exist, and — for a §2.4.7
 * handover seat holding two occupancies — the PRIMARY (active) occupant's
 * secret rather than the demoted stand-in's.
 */
describe("findParticipantSecret", () => {
  let harness: DbHarness;

  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
  });

  afterEach(() => {
    harness.teardown();
  });

  async function seatPair(seat: string, secretKey: string) {
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
      secretKey,
    } as never);
  }

  it("returns the secretKey for a seated pair", async () => {
    await seatPair("A1NS", "secret-abc");

    const { findParticipantSecret } = await import(
      "@/db/games/queries/find-participant-secret"
    );

    expect(await findParticipantSecret(harness.gameId, "A1NS")).toBe(
      "secret-abc",
    );
  });

  it("returns null for an unknown seat", async () => {
    await seatPair("A1NS", "secret-abc");

    const { findParticipantSecret } = await import(
      "@/db/games/queries/find-participant-secret"
    );

    expect(await findParticipantSecret(harness.gameId, "Z9NS")).toBeNull();
  });

  it("returns null when the game database does not exist", async () => {
    const { findParticipantSecret } = await import(
      "@/db/games/queries/find-participant-secret"
    );

    expect(
      await findParticipantSecret("nonexistent-game", "A1NS"),
    ).toBeNull();
  });

  it("returns the ACTIVE occupant's secret on a handover seat, not the stand-in's", async () => {
    // Seat the arriving real pair (whole seat, ranked) as the primary occupant.
    await seatPair("A1NS", "secret-real");

    // Insert a §2.4.7 stand-in on the SAME seat, demoted to WITHOUT_STANDING
    // with its own (now dead) secret. The stand-in and the real pair never
    // authenticate at the same instant; auth must resolve to the real pair.
    const { getDb } = await import("@/db/games");
    const { seatOccupancy } = await import(
      "@/db/games/tables/seat-occupancy"
    );
    const { createPlayer } = await import("@/db/games/actions/create-player");
    const db = await getDb(harness.gameId);
    if (!db) throw new Error("expected game db");

    const s1 = await createPlayer(harness.gameId, {
      firstName: "Sam",
      lastName: "Stand",
    });
    const s2 = await createPlayer(harness.gameId, {
      firstName: "Sid",
      lastName: "In",
    });
    db.insert(seatOccupancy)
      .values({
        seat: "A1NS" as PairSeat,
        boards: [1, 2],
        player1: s1.id,
        player2: s2.id,
        secretKey: "secret-standin",
        standing: "WITHOUT_STANDING",
      })
      .run();

    const { findParticipantSecret } = await import(
      "@/db/games/queries/find-participant-secret"
    );

    expect(await findParticipantSecret(harness.gameId, "A1NS")).toBe(
      "secret-real",
    );
  });
});
