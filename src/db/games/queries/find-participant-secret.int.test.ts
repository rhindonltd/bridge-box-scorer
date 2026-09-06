// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { PairSeat } from "@/model/participants";

/**
 * Integration coverage for findParticipantSecret against a real migrated
 * SQLite file: returns the stored secretKey for a seated pair, null for an
 * unknown seat, and null when the game database does not exist.
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
});
