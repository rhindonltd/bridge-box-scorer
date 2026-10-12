// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { PairSeat } from "@/model/participants";

/**
 * Integration coverage for rotateParticipantSecret against a real migrated
 * SQLite file. Rotation targets the seat's CURRENT (primary) occupant: on an
 * ordinary single-occupancy seat it rotates that pair; on a §2.4.7 handover
 * seat it rotates only the active real pair, leaving the demoted stand-in's
 * (dead) secret untouched. Returns false for an empty / nonexistent seat.
 */
describe("rotateParticipantSecret", () => {
  let harness: DbHarness;

  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
  });

  afterEach(() => {
    harness.teardown();
  });

  async function seatPair(seat: string, secretKey: string, standing?: string) {
    const { getDb } = await import("@/db/games");
    const { seatOccupancy } = await import(
      "@/db/games/tables/seat-occupancy"
    );
    const { createPlayer } = await import("@/db/games/actions/create-player");
    const db = await getDb(harness.gameId);
    if (!db) throw new Error("expected game db");

    const p1 = await createPlayer(harness.gameId, {
      firstName: "P1",
      lastName: seat,
    });
    const p2 = await createPlayer(harness.gameId, {
      firstName: "P2",
      lastName: seat,
    });

    return db
      .insert(seatOccupancy)
      .values({
        seat: seat as PairSeat,
        boards: standing === "WITHOUT_STANDING" ? [1, 2] : null,
        player1: p1.id,
        player2: p2.id,
        secretKey,
        ...(standing ? { standing: standing as never } : {}),
      })
      .returning()
      .get();
  }

  async function secretOf(occupancyId: number): Promise<string> {
    const { getDb } = await import("@/db/games");
    const { seatOccupancy } = await import(
      "@/db/games/tables/seat-occupancy"
    );
    const { eq } = await import("drizzle-orm");
    const db = await getDb(harness.gameId);
    if (!db) throw new Error("expected game db");
    const row = db
      .select({ secretKey: seatOccupancy.secretKey })
      .from(seatOccupancy)
      .where(eq(seatOccupancy.id, occupancyId))
      .get();
    return row!.secretKey;
  }

  it("returns false when the game db does not exist", async () => {
    const { rotateParticipantSecret } = await import(
      "./rotate-participant-secret"
    );
    expect(
      await rotateParticipantSecret("nonexistent-game", "A1NS", "new-secret"),
    ).toBe(false);
  });

  it("rotates the seat's secret and returns true for a single occupancy", async () => {
    const row = await seatPair("A1NS", "old-secret");

    const { rotateParticipantSecret } = await import(
      "./rotate-participant-secret"
    );
    expect(
      await rotateParticipantSecret(harness.gameId, "A1NS", "new-secret"),
    ).toBe(true);
    expect(await secretOf(row.id)).toBe("new-secret");
  });

  it("returns false when no pair is seated at the seat", async () => {
    const { rotateParticipantSecret } = await import(
      "./rotate-participant-secret"
    );
    expect(
      await rotateParticipantSecret(harness.gameId, "A1NS", "new-secret"),
    ).toBe(false);
  });

  it("rotates only the ACTIVE occupant on a handover seat, leaving the stand-in untouched", async () => {
    const real = await seatPair("A1NS", "real-old");
    const sub = await seatPair("A1NS", "sub-secret", "WITHOUT_STANDING");

    const { rotateParticipantSecret } = await import(
      "./rotate-participant-secret"
    );
    expect(
      await rotateParticipantSecret(harness.gameId, "A1NS", "real-new"),
    ).toBe(true);

    expect(await secretOf(real.id)).toBe("real-new");
    expect(await secretOf(sub.id)).toBe("sub-secret");
  });
});
