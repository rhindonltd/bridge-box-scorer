// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import type { PairSeat } from "@/model/participants";

/**
 * Integration coverage for findTeams: teams derived from seating (the NS + EW
 * pair at a home table form one team, id = the NS seat), against a real
 * migrated SQLite file.
 */
describe("games db: findTeams", () => {
  let harness: DbHarness;

  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
  });

  afterEach(() => {
    harness.teardown();
  });

  async function seatPair(seat: string, first: string) {
    const { createPlayer } = await import("@/db/games/actions/create-player");
    const { createParticipant } = await import(
      "@/db/games/actions/create-participant"
    );

    const p1 = await createPlayer(harness.gameId, {
      firstName: first,
      lastName: "One",
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

  it("forms a team from the NS + EW pair at a home table", async () => {
    await seatPair("A1NS", "Home");
    await seatPair("A1EW", "Away");

    const { findTeams } = await import("@/db/games/queries/find-teams");
    const db = (await harness.getDb()) as Db;

    const teams = await findTeams(db);
    expect(teams).toHaveLength(1);
    expect(teams[0]).toMatchObject({
      type: "TEAM",
      id: "A1NS",
      pair1: { initialSeat: "A1NS", player1: { firstName: "Home" } },
      pair2: { initialSeat: "A1EW", player1: { firstName: "Away" } },
    });
  });

  it("omits a table with only one seat filled (incomplete team)", async () => {
    await seatPair("A1NS", "Home");
    // No EW pair at table 1 yet.

    const { findTeams } = await import("@/db/games/queries/find-teams");
    const db = (await harness.getDb()) as Db;

    expect(await findTeams(db)).toHaveLength(0);
  });

  it("returns one team per home table, ordered by section then table", async () => {
    await seatPair("A2NS", "H2");
    await seatPair("A2EW", "A2");
    await seatPair("A1NS", "H1");
    await seatPair("A1EW", "A1");

    const { findTeams } = await import("@/db/games/queries/find-teams");
    const db = (await harness.getDb()) as Db;

    const teams = await findTeams(db);
    expect(teams.map((t) => t.id)).toEqual(["A1NS", "A2NS"]);
  });
});
