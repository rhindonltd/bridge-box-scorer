// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import type { PairSeat } from "@/model/participants";

/**
 * Integration coverage for findTeamsRoster: each team's standing (read off the
 * home NS seat) and the pairs that have sat its two seats, against a real
 * migrated SQLite file.
 */
describe("games db: findTeamsRoster", () => {
  let harness: DbHarness;

  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
  });

  afterEach(() => {
    harness.teardown();
  });

  async function seatPair(seat: string, first: string, lastName = "One") {
    const { createPlayer } = await import("@/db/games/actions/create-player");
    const { createParticipant } = await import(
      "@/db/games/actions/create-participant"
    );

    const p1 = await createPlayer(harness.gameId, {
      firstName: first,
      lastName,
    });
    const p2 = await createPlayer(harness.gameId, {
      firstName: first,
      lastName: "Two",
    });

    await createParticipant(harness.gameId, {
      type: "PAIR",
      initialSeat: seat as PairSeat,
      player1: p1.id,
      player2: p2.id,
      secretKey: seat,
    } as never);
  }

  async function roster() {
    const { findTeamsRoster } = await import(
      "@/db/games/queries/find-teams-roster"
    );
    const db = (await harness.getDb()) as Db;
    return findTeamsRoster(db);
  }

  it("lists each team with its section, number, seats and two pairs used", async () => {
    await seatPair("A1NS", "Home", "Smith");
    await seatPair("A1EW", "Away");

    const [team] = await roster();
    expect(team).toMatchObject({
      teamId: "A1NS",
      name: "Smith",
      section: "A",
      number: "1",
      status: "ACTIVE",
      round: null,
      pairsUsed: 2,
      maxPairs: 3,
    });
    expect(team.seats.map((s) => [s.seat, s.label])).toEqual([
      ["A1NS", "Home"],
      ["A1EW", "Away"],
    ]);
    expect(team.seats[0].occupants[0].pair).toBe("Home Smith & Home Two");
  });

  it("orders teams by section then number", async () => {
    await seatPair("B1NS", "B1");
    await seatPair("B1EW", "b1");
    await seatPair("A2NS", "A2");
    await seatPair("A2EW", "a2");
    await seatPair("A1NS", "A1");
    await seatPair("A1EW", "a1");

    expect((await roster()).map((t) => t.teamId)).toEqual([
      "A1NS",
      "A2NS",
      "B1NS",
    ]);
  });

  it("reports the standing recorded on the home NS seat", async () => {
    await seatPair("A1NS", "Home");
    await seatPair("A1EW", "Away");

    const { withdrawParticipant } = await import(
      "@/db/games/actions/withdraw-participant"
    );
    await withdrawParticipant(harness.gameId, "A1NS", {
      standing: "WITHDRAWN",
      withdrawnInRound: 3,
      treatment: "REMOVE",
    });

    const [team] = await roster();
    expect(team).toMatchObject({
      status: "WITHDRAWN",
      round: 3,
      treatment: "REMOVE",
    });

    await withdrawParticipant(harness.gameId, "A1NS", {
      standing: "WITHOUT_STANDING",
    });
    expect((await roster())[0]).toMatchObject({
      status: "WITHOUT_STANDING",
      round: null,
      treatment: null,
    });
  });
});
