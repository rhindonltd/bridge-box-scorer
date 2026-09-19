import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games/queries/find-pairs", () => ({ findPairs: vi.fn() }));

import { findPairs } from "@/db/games/queries/find-pairs";
import { findTeams } from "./find-teams";
import type { Pair } from "@/model/participants";

/** A db whose `select().from()` resolves to the given team-name rows. */
function stubDb(nameRows: { teamId: string; teamName: string | null }[]) {
  const from = vi.fn(() => Promise.resolve(nameRows));
  const select = vi.fn(() => ({ from }));
  return { select } as never;
}

const pair = (initialSeat: string, lastName: string): Pair =>
  ({
    initialSeat,
    type: "PAIR",
    player1: { id: 1, firstName: "A", lastName, nationalId: null },
    player2: { id: 2, firstName: "B", lastName: "Other", nationalId: null },
  }) as any;

describe("findTeams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("pairs up NS/EW at a home table into a team, using the surname fallback", async () => {
    vi.mocked(findPairs).mockResolvedValue([
      pair("A1NS", "Smith"),
      pair("A1EW", "Jones"),
    ]);

    const teams = await findTeams(stubDb([]));
    expect(teams).toHaveLength(1);
    expect(teams[0]).toMatchObject({
      type: "TEAM",
      id: "A1NS",
      name: "Smith",
    });
  });

  it("prefers a stored (trimmed) team name over the surname fallback", async () => {
    vi.mocked(findPairs).mockResolvedValue([
      pair("A1NS", "Smith"),
      pair("A1EW", "Jones"),
    ]);

    const teams = await findTeams(
      stubDb([{ teamId: "A1", teamName: "  Aces  " }]),
    );
    expect(teams[0].name).toBe("Aces");
  });

  it("ignores an empty stored team name (surname fallback stays)", async () => {
    vi.mocked(findPairs).mockResolvedValue([
      pair("A1NS", "Smith"),
      pair("A1EW", "Jones"),
    ]);

    const teams = await findTeams(stubDb([{ teamId: "A1", teamName: "   " }]));
    expect(teams[0].name).toBe("Smith");
  });

  it("omits an incomplete table (only one seat filled)", async () => {
    vi.mocked(findPairs).mockResolvedValue([pair("A1NS", "Smith")]);
    const teams = await findTeams(stubDb([]));
    expect(teams).toEqual([]);
  });

  it("orders teams by section then table number", async () => {
    vi.mocked(findPairs).mockResolvedValue([
      pair("B1NS", "Bravo"),
      pair("B1EW", "BravoEW"),
      pair("A2NS", "Alpha2"),
      pair("A2EW", "Alpha2EW"),
      pair("A1NS", "Alpha1"),
      pair("A1EW", "Alpha1EW"),
    ]);

    const teams = await findTeams(stubDb([]));
    // A before B; within A, table 1 before table 2.
    expect(teams.map((t) => t.id)).toEqual(["A1NS", "A2NS", "B1NS"]);
  });

  it("sorts across sections when the input already leads with the lower section", async () => {
    // Input order A then B exercises the comparator's `pa.section < pb.section`
    // (-1) branch, complementing the reverse-order case above (which hits +1).
    vi.mocked(findPairs).mockResolvedValue([
      pair("A1NS", "Alpha"),
      pair("A1EW", "AlphaEW"),
      pair("B1NS", "Bravo"),
      pair("B1EW", "BravoEW"),
    ]);

    const teams = await findTeams(stubDb([]));
    expect(teams.map((t) => t.id)).toEqual(["A1NS", "B1NS"]);
  });
});
