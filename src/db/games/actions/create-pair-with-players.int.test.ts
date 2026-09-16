// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import type { PairSeat } from "@/model/participants";

/**
 * Integration coverage for the team-name write in createPairWithPlayers:
 *  - an NS pair seated with a name writes the teams row (keyed by the
 *    home-table id, e.g. "A1");
 *  - a blank/omitted name writes no teams row (so the read-time surname
 *    fallback applies);
 *  - a name passed for an EW seat is ignored (a team is named by its home NS
 *    pair, not the away pair).
 */
describe("games db: createPairWithPlayers team name", () => {
  let harness: DbHarness;

  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
  });

  afterEach(() => {
    harness.teardown();
  });

  async function seat(seat: string, teamName?: string | null) {
    const { createPairWithPlayers } = await import(
      "@/db/games/actions/create-pair-with-players"
    );
    await createPairWithPlayers(harness.gameId, {
      initialSeat: seat as PairSeat,
      player1: { firstName: "North", lastName: "Smith" },
      player2: { firstName: "South", lastName: "Jones" },
      secretKey: seat,
      teamName,
    });
  }

  async function teamRows() {
    const { teams } = await import("@/db/games/tables/teams");
    const db = (await harness.getDb()) as Db;
    return db.select().from(teams).all();
  }

  it("writes a teams row keyed by the home-table id when an NS pair is named", async () => {
    await seat("A1NS", "Sharks");

    expect(await teamRows()).toEqual([{ teamId: "A1", teamName: "Sharks" }]);
  });

  it("writes no teams row when the name is blank", async () => {
    await seat("A1NS", "   ");

    expect(await teamRows()).toEqual([]);
  });

  it("writes no teams row when the name is omitted", async () => {
    await seat("A1NS");

    expect(await teamRows()).toEqual([]);
  });

  it("ignores a name given for an EW seat", async () => {
    await seat("A1EW", "Sharks");

    expect(await teamRows()).toEqual([]);
  });

  it("trims surrounding whitespace from the stored name", async () => {
    await seat("A2NS", "  Dragons  ");

    expect(await teamRows()).toEqual([{ teamId: "A2", teamName: "Dragons" }]);
  });
});
