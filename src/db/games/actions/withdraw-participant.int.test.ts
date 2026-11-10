// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import { players } from "@/db/games/tables/players";
import { seatOccupancy } from "@/db/games/tables/seat-occupancy";
/**
 * Integration coverage for withdrawParticipant against a real migrated
 * per-game database: each standing change stamps (or clears) the lifecycle
 * fields, the PENALISED fine is clamped to 0..40, and a missing game/seat is
 * reported as false.
 */
describe("withdrawParticipant", () => {
  let harness: DbHarness;
  let db: Db;
  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
    db = (await harness.getDb()) as Db;
    const p1 = db
      .insert(players)
      .values({ firstName: "A", lastName: "One" })
      .returning()
      .get();
    const p2 = db
      .insert(players)
      .values({ firstName: "A", lastName: "Two" })
      .returning()
      .get();
    db.insert(seatOccupancy)
      .values({ seat: "A1NS", player1: p1.id, player2: p2.id, secretKey: "k" })
      .run();
  });
  afterEach(() => {
    harness.teardown();
  });
  const occ = () => db.select().from(seatOccupancy).get()!;
  async function withdraw(change: unknown, seat = "A1NS", gameId = harness.gameId) {
    const { withdrawParticipant } = await import(
      "@/db/games/actions/withdraw-participant"
    );
    return withdrawParticipant(gameId, seat, change as never);
  }
  it("records a REMOVE withdrawal with no fine", async () => {
    expect(
      await withdraw({
        standing: "WITHDRAWN",
        withdrawnInRound: 3,
        treatment: "REMOVE",
        finePercent: 20,
      }),
    ).toBe(true);
    expect(occ()).toMatchObject({
      standing: "WITHDRAWN",
      withdrawnInRound: 3,
      withdrawalTreatment: "REMOVE",
      withdrawalFinePercent: null,
    });
  });
  it("records a LATE arrival with its round and treatment", async () => {
    await withdraw({
      standing: "LATE",
      arrivedInRound: 2,
      treatment: "PENALISED",
      finePercent: 10,
    });
    expect(occ()).toMatchObject({
      standing: "LATE",
      withdrawnInRound: 2,
      withdrawalTreatment: "PENALISED",
      withdrawalFinePercent: 10,
    });
  });
  it("clamps the PENALISED fine into 0..40 and defaults a missing or NaN fine to 0", async () => {
    const penalised = (finePercent?: number) =>
      withdraw({
        standing: "WITHDRAWN",
        withdrawnInRound: 1,
        treatment: "PENALISED",
        finePercent,
      });
    await penalised(99);
    expect(occ().withdrawalFinePercent).toBe(40);
    await penalised(-5);
    expect(occ().withdrawalFinePercent).toBe(0);
    await penalised(12.6);
    expect(occ().withdrawalFinePercent).toBe(13);
    await penalised(undefined);
    expect(occ().withdrawalFinePercent).toBe(0);
    await penalised(Number.NaN);
    expect(occ().withdrawalFinePercent).toBe(0);
  });
  it("clears the withdrawal fields when moving back to a standing that doesn't use them", async () => {
    await withdraw({
      standing: "WITHDRAWN",
      withdrawnInRound: 3,
      treatment: "PENALISED",
      finePercent: 10,
    });
    await withdraw({ standing: "WITHOUT_STANDING" });
    expect(occ()).toMatchObject({
      standing: "WITHOUT_STANDING",
      withdrawnInRound: null,
      withdrawalTreatment: null,
      withdrawalFinePercent: null,
    });
    await withdraw({ standing: "ACTIVE" });
    expect(occ().standing).toBe("ACTIVE");
  });
  it("returns false when no pair is seated there or the game has no database", async () => {
    expect(await withdraw({ standing: "ACTIVE" }, "A9NS")).toBe(false);
    expect(await withdraw({ standing: "ACTIVE" }, "A1NS", "no-such-game")).toBe(
      false,
    );
  });
});
