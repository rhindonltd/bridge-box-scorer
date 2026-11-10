import { describe, it, expect } from "vitest";
import type { AssignedTeam, Pair } from "@/model/participants";
import { buildTeamPairing, type TeamOccupancy } from "./team-pairing";

const player = (first: string) => ({
  firstName: first,
  lastName: "X",
  nationalId: null,
});

function pair(seat: string, first: string): Pair {
  return {
    type: "PAIR",
    initialSeat: seat as Pair["initialSeat"],
    player1: { id: 1, firstName: `${first}1`, lastName: "X", nationalId: null },
    player2: { id: 2, firstName: `${first}2`, lastName: "X", nationalId: null },
  };
}

function team(table: number): AssignedTeam {
  return {
    type: "TEAM",
    id: `A${table}NS`,
    name: `Team ${table}`,
    pair1: pair(`A${table}NS`, `n${table}`),
    pair2: pair(`A${table}EW`, `e${table}`),
  } as AssignedTeam;
}

function occ(
  id: number,
  seat: string,
  first: string,
  extra: Partial<TeamOccupancy> = {},
): TeamOccupancy {
  return {
    id,
    seat,
    anchorId: null,
    boards: null,
    player1: player(`${first}1`),
    player2: player(`${first}2`),
    ...extra,
  };
}

describe("buildTeamPairing", () => {
  const teams = [team(1), team(2)];

  it("with no occupancies, falls back to the team's own two pairs", () => {
    const p = buildTeamPairing(teams);
    const pairs = p.pairsByTeamId.get("A1NS")!;
    expect(pairs.map((x) => x.pairNumber)).toEqual(["1NS", "1EW"]);
    expect(pairs[0].player1.firstName).toBe("n11");
    expect(pairs[1].player1.firstName).toBe("e11");
  });

  it("resolves a plain seat to its partnership regardless of board", () => {
    const p = buildTeamPairing(teams);
    expect(p.pairNumberFor("A1NS", 5)).toBe("1NS");
    expect(p.pairNumberFor("A1EW", 5)).toBe("1EW");
    expect(p.pairNumberFor("A2NS", 1)).toBe("2NS");
    expect(p.pairNumberFor("A2EW", 1)).toBe("2EW");
  });

  it("returns undefined for a seat nobody sat", () => {
    const p = buildTeamPairing(teams);
    expect(p.pairNumberFor("A9NS", 1)).toBeUndefined();
  });

  it("ignores a #occupancy suffix on the board id", () => {
    const p = buildTeamPairing(teams);
    expect(p.pairNumberFor("A1NS#4", 1)).toBe("1NS");
  });

  it("declares a substitute as a third partnership with its app id, keeping the originals' ids", () => {
    // Team 1's NS seat was handed over after board 2: the original pair played
    // boards 1–2, the substitute boards 3–4.
    const occupancies = [
      occ(1, "A1NS", "orig", { boards: [1, 2] }),
      occ(2, "A1NS", "sub", { boards: [3, 4] }),
      occ(3, "A1EW", "away"),
      occ(4, "A2NS", "t2n"),
      occ(5, "A2EW", "t2e"),
    ];
    const p = buildTeamPairing(teams, occupancies);

    const pairs = p.pairsByTeamId.get("A1NS")!;
    // Starting pairs are their bare seats; the substitute is seat#occupancyId.
    expect(pairs.map((x) => x.pairNumber)).toEqual(["1NS", "1EW", "1NS#2"]);
    expect(pairs[0].player1.firstName).toBe("orig1");
    expect(pairs[1].player1.firstName).toBe("away1");
    expect(pairs[2].player1.firstName).toBe("sub1");
  });

  it("tags each board with the partnership that played it across a handover", () => {
    const occupancies = [
      occ(1, "A1NS", "orig", { boards: [1, 2] }),
      occ(2, "A1NS", "sub", { boards: [3, 4] }),
      occ(3, "A1EW", "away"),
    ];
    const p = buildTeamPairing([team(1)], occupancies);

    expect(p.pairNumberFor("A1NS", 1)).toBe("1NS");
    expect(p.pairNumberFor("A1NS", 2)).toBe("1NS");
    expect(p.pairNumberFor("A1NS", 3)).toBe("1NS#2");
    expect(p.pairNumberFor("A1NS", 4)).toBe("1NS#2");
    // The EW seat is untouched by the NS handover.
    expect(p.pairNumberFor("A1EW", 3)).toBe("1EW");
  });

  it("keeps the same ids when the original pair returns (no extra player)", () => {
    // The substitute played boards 3–4, then the original pair came back for
    // 5–6. Same TWO occupancies as before — the original's board set just grew
    // to the non-contiguous {1,2,5,6} — so the roster is still three pairs and
    // nobody is renumbered.
    const occupancies = [
      occ(1, "A1NS", "orig", { boards: [1, 2, 5, 6] }),
      occ(2, "A1NS", "sub", { boards: [3, 4] }),
      occ(3, "A1EW", "away"),
    ];
    const p = buildTeamPairing([team(1)], occupancies);

    const pairs = p.pairsByTeamId.get("A1NS")!;
    expect(pairs).toHaveLength(3);
    expect(pairs.map((x) => x.pairNumber)).toEqual(["1NS", "1EW", "1NS#2"]);
    expect(pairs[0].player1.firstName).toBe("orig1");
    expect(pairs[2].player1.firstName).toBe("sub1");

    expect(p.pairNumberFor("A1NS", 1)).toBe("1NS");
    expect(p.pairNumberFor("A1NS", 3)).toBe("1NS#2");
    expect(p.pairNumberFor("A1NS", 4)).toBe("1NS#2");
    // Back to the original pair for the later boards.
    expect(p.pairNumberFor("A1NS", 5)).toBe("1NS");
    expect(p.pairNumberFor("A1NS", 6)).toBe("1NS");
  });

  it("handles a substitute on the EW (travelling) seat", () => {
    const occupancies = [
      occ(1, "A1NS", "home"),
      occ(2, "A1EW", "orig", { boards: [1] }),
      occ(3, "A1EW", "sub", { boards: [2, 3] }),
    ];
    const p = buildTeamPairing([team(1)], occupancies);

    expect(p.pairsByTeamId.get("A1NS")!.map((x) => x.pairNumber)).toEqual([
      "1NS",
      "1EW",
      "1EW#3",
    ]);
    expect(p.pairNumberFor("A1EW", 1)).toBe("1EW");
    expect(p.pairNumberFor("A1EW", 2)).toBe("1EW#3");
    expect(p.pairNumberFor("A1NS", 2)).toBe("1NS");
  });

  it("orders starters NS then EW before substitutes, even when both seats were substituted", () => {
    // Not reachable through the app (a team is capped at three pairs) but the
    // ordering must still be deterministic.
    const occupancies = [
      occ(1, "A1NS", "nsOrig", { boards: [1] }),
      occ(2, "A1NS", "nsSub", { boards: [2] }),
      occ(3, "A1EW", "ewOrig", { boards: [1] }),
      occ(4, "A1EW", "ewSub", { boards: [2] }),
    ];
    const p = buildTeamPairing([team(1)], occupancies);
    const pairs = p.pairsByTeamId.get("A1NS")!;
    expect(pairs.map((x) => x.player1.firstName)).toEqual([
      "nsOrig1",
      "ewOrig1",
      "nsSub1",
      "ewSub1",
    ]);
    expect(p.pairNumberFor("A1NS", 2)).toBe("1NS#2");
    expect(p.pairNumberFor("A1EW", 2)).toBe("1EW#4");
  });

  it("matches rows by anchorId when the seat carries a different board id", () => {
    const occupancies = [
      occ(1, "A1NS", "home", { anchorId: "A1" }),
      occ(2, "A1EW", "away", { anchorId: "A6" }),
    ];
    const p = buildTeamPairing([team(1)], occupancies);
    expect(p.pairNumberFor("A1", 1)).toBe("1NS");
    expect(p.pairNumberFor("A6", 1)).toBe("1EW");
    expect(p.pairNumberFor("A1NS", 1)).toBeUndefined();
  });

  it("falls back to a whole-seat occupant for a board outside every board set", () => {
    const occupancies = [
      occ(1, "A1NS", "orig", { boards: [1] }),
      occ(2, "A1NS", "sub", { boards: null }),
    ];
    const p = buildTeamPairing([team(1)], occupancies);
    // Board 9 is in no explicit set → the boards=null occupant covers it.
    expect(p.pairNumberFor("A1NS", 9)).toBe("1NS#2");
  });

  it("keeps the section prefix when the teams span more than one section", () => {
    const bTeam = {
      ...team(1),
      id: "B1NS",
      pair1: pair("B1NS", "bn"),
      pair2: pair("B1EW", "be"),
    } as AssignedTeam;
    const p = buildTeamPairing([team(1), bTeam]);
    expect(p.pairsByTeamId.get("A1NS")!.map((x) => x.pairNumber)).toEqual([
      "A1NS",
      "A1EW",
    ]);
    expect(p.pairsByTeamId.get("B1NS")!.map((x) => x.pairNumber)).toEqual([
      "B1NS",
      "B1EW",
    ]);
  });
  it("falls back to the first occupant when no one is recorded for the board", () => {
    // Only a board-limited occupant exists for the seat; board 9 matches no
    // one, so the first occupant's number is used rather than none.
    const p = buildTeamPairing(teams, [
      occ(1, "A1NS", "orig", { boards: [1, 2] }),
      occ(2, "A1EW", "ew"),
    ]);
    expect(p.pairNumberFor("A1NS", 9)).toBe("1NS");
  });
});
