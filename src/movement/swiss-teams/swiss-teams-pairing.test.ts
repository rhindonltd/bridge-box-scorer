import { describe, it, expect } from "vitest";
import {
  continueLongTriple,
  drawSwissTeamsRound,
  evaluateSwissTeamsRound,
  expandTeamMatches,
  expandTeamTriple,
  roundOddResolution,
  roundTeamIds,
  swapTeams,
  teamIds,
  swissTeamsRoundOne,
  teamOpponentKey,
  type SwissTeamsRound,
} from "./swiss-teams-pairing";

describe("teamIds", () => {
  it("returns 1..teams", () => {
    expect(teamIds(4)).toEqual([1, 2, 3, 4]);
  });
});

describe("teamOpponentKey", () => {
  it("is order-independent (normalises to low-high)", () => {
    expect(teamOpponentKey(1, 4)).toBe("1-4");
    expect(teamOpponentKey(4, 1)).toBe("1-4");
    expect(teamOpponentKey(4, 1)).toBe(teamOpponentKey(1, 4));
  });
});

describe("swissTeamsRoundOne", () => {
  it("pairs every team exactly once into teams/2 matches (even, no bye)", () => {
    const { matches, byeTeamId } = swissTeamsRoundOne(6, 123);
    expect(byeTeamId).toBeNull();
    expect(matches).toHaveLength(3);
    const seen = matches.flatMap((m) => [m.a, m.b]).sort((x, y) => x - y);
    expect(seen).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("is deterministic for a given seed and can vary across seeds", () => {
    expect(swissTeamsRoundOne(8, 42)).toEqual(swissTeamsRoundOne(8, 42));
    // At least one seed produces a different draw (guards against a no-op RNG).
    const a = JSON.stringify(swissTeamsRoundOne(8, 1));
    const b = JSON.stringify(swissTeamsRoundOne(8, 2));
    const c = JSON.stringify(swissTeamsRoundOne(8, 3));
    expect(new Set([a, b, c]).size).toBeGreaterThan(1);
  });

  it("byes the bottom table and pairs the rest for an odd field", () => {
    const { matches, byeTeamId } = swissTeamsRoundOne(5, 1);
    // Bottom table (highest id) sits out round 1.
    expect(byeTeamId).toBe(5);
    expect(matches).toHaveLength(2);
    const seen = matches.flatMap((m) => [m.a, m.b]).sort((x, y) => x - y);
    expect(seen).toEqual([1, 2, 3, 4]);
    // The bye team never appears in a match.
    expect(seen).not.toContain(5);
  });

  it("returns matches in ascending lower-team-id order", () => {
    const { matches } = swissTeamsRoundOne(6, 999);
    const firsts = matches.map((m) => m.a);
    expect([...firsts]).toEqual([...firsts].sort((x, y) => x - y));
    // Each match is normalised so a <= b.
    for (const m of matches) expect(m.a).toBeLessThanOrEqual(m.b);
  });

  it("short-triples the bottom three tables and pairs the rest (odd, SHORT)", () => {
    const { matches, byeTeamId, triple } = swissTeamsRoundOne(7, 1, "SHORT");
    // Bottom three tables (5,6,7) form the round-1 short triple; no bye.
    expect(byeTeamId).toBeNull();
    expect(triple).toEqual({
      a: 5,
      b: 6,
      c: 7,
      kind: "SHORT",
      group: null,
      slot: null,
    });
    // The remaining even field (1,2,3,4) is paired.
    expect(matches).toHaveLength(2);
    const seen = matches.flatMap((m) => [m.a, m.b]).sort((x, y) => x - y);
    expect(seen).toEqual([1, 2, 3, 4]);
  });

  it("long-triples round 1 as slot 1, carrying the group (odd, LONG)", () => {
    const { byeTeamId, triple } = swissTeamsRoundOne(7, 1, {
      kind: "LONG",
      group: 2,
    });
    expect(byeTeamId).toBeNull();
    expect(triple).toEqual({
      a: 5,
      b: 6,
      c: 7,
      kind: "LONG",
      group: 2,
      slot: 1,
    });
  });

  it("still byes the bottom table for an odd field when the entry is BYE", () => {
    const { byeTeamId, triple } = swissTeamsRoundOne(5, 1, "BYE");
    expect(byeTeamId).toBe(5);
    expect(triple).toBeNull();
  });

  it("ignores a triple entry for an even field (no triple, no bye)", () => {
    const { byeTeamId, triple } = swissTeamsRoundOne(6, 1, "SHORT");
    expect(byeTeamId).toBeNull();
    expect(triple).toBeNull();
  });
});

describe("drawSwissTeamsRound", () => {
  it("prefers adjacent standings when there is no history", () => {
    const { matches, hadUnavoidableRepeat } = drawSwissTeamsRound({
      teams: 4,
      standings: [1, 2, 3, 4],
      playedOpponents: new Set(),
    });
    expect(hadUnavoidableRepeat).toBe(false);
    expect(matches).toEqual([
      { a: 1, b: 2 },
      { a: 3, b: 4 },
    ]);
  });

  it("avoids a repeat opponent when possible", () => {
    // 1 already played 2, so the repeat-free draw is 1v3, 2v4.
    const { matches, hadUnavoidableRepeat } = drawSwissTeamsRound({
      teams: 4,
      standings: [1, 2, 3, 4],
      playedOpponents: new Set([teamOpponentKey(1, 2)]),
    });
    expect(hadUnavoidableRepeat).toBe(false);
    const keys = matches.map((m) => teamOpponentKey(m.a, m.b));
    expect(keys).not.toContain(teamOpponentKey(1, 2));
  });

  it("prunes inferior branches and settles on a repeat-free draw (larger field)", () => {
    // Six teams whose nearest-rank partners have already met, forcing the
    // search to explore and prune repeat branches before finding a clean draw.
    const { matches, hadUnavoidableRepeat } = drawSwissTeamsRound({
      teams: 6,
      standings: [1, 2, 3, 4, 5, 6],
      playedOpponents: new Set([
        teamOpponentKey(1, 2),
        teamOpponentKey(3, 4),
        teamOpponentKey(5, 6),
      ]),
    });

    expect(hadUnavoidableRepeat).toBe(false);
    const keys = matches.map((m) => teamOpponentKey(m.a, m.b));
    expect(keys).not.toContain(teamOpponentKey(1, 2));
    expect(keys).not.toContain(teamOpponentKey(3, 4));
    expect(keys).not.toContain(teamOpponentKey(5, 6));
    const seen = matches.flatMap((m) => [m.a, m.b]).sort((x, y) => x - y);
    expect(seen).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("flags an unavoidable repeat when the field is exhausted", () => {
    // Two teams that have already met must meet again.
    const { hadUnavoidableRepeat } = drawSwissTeamsRound({
      teams: 2,
      standings: [1, 2],
      playedOpponents: new Set([teamOpponentKey(1, 2)]),
    });
    expect(hadUnavoidableRepeat).toBe(true);
  });

  it("byes the lowest-ranked eligible team on an odd field", () => {
    // Standings best-first [1,2,3,4,5]; team 5 (lowest) has already had a bye,
    // so the bye goes to team 4 (next lowest without a prior bye).
    const { matches, byeTeamId } = drawSwissTeamsRound({
      teams: 5,
      standings: [1, 2, 3, 4, 5],
      playedOpponents: new Set(),
      hadBye: new Set([5]),
    });

    expect(byeTeamId).toBe(4);
    const seen = matches.flatMap((m) => [m.a, m.b]).sort((x, y) => x - y);
    // The remaining even field (1,2,3,5) is paired; the bye team is excluded.
    expect(seen).toEqual([1, 2, 3, 5]);
    expect(seen).not.toContain(4);
  });

  it("byes the lowest-ranked team when none has had a bye yet", () => {
    const { byeTeamId } = drawSwissTeamsRound({
      teams: 5,
      standings: [1, 2, 3, 4, 5],
      playedOpponents: new Set(),
    });
    expect(byeTeamId).toBe(5);
  });

  it("falls back to the lowest-ranked team when all have had a bye", () => {
    const { byeTeamId } = drawSwissTeamsRound({
      teams: 3,
      standings: [1, 2, 3],
      playedOpponents: new Set(),
      hadBye: new Set([1, 2, 3]),
    });
    expect(byeTeamId).toBe(3);
  });

  it("reports a null bye for an even field", () => {
    const { byeTeamId } = drawSwissTeamsRound({
      teams: 4,
      standings: [1, 2, 3, 4],
      playedOpponents: new Set(),
    });
    expect(byeTeamId).toBeNull();
  });

  it("short-triples the lowest-ranked three and pairs the rest (odd, SHORT)", () => {
    // Standings best-first [1..7]; the lowest three (5,6,7) form the triple.
    const { matches, byeTeamId, triple } = drawSwissTeamsRound({
      teams: 7,
      standings: [1, 2, 3, 4, 5, 6, 7],
      playedOpponents: new Set(),
      oddRound: "SHORT",
    });

    expect(byeTeamId).toBeNull();
    expect(triple).toEqual({
      a: 5,
      b: 6,
      c: 7,
      kind: "SHORT",
      group: null,
      slot: null,
    });
    const seen = matches.flatMap((m) => [m.a, m.b]).sort((x, y) => x - y);
    expect(seen).toEqual([1, 2, 3, 4]);
  });

  it("long-triples the lowest-ranked three (odd, LONG) as slot 1 with its group", () => {
    const { triple } = drawSwissTeamsRound({
      teams: 7,
      standings: [1, 2, 3, 4, 5, 6, 7],
      playedOpponents: new Set(),
      oddRound: { kind: "LONG", group: 3 },
    });
    expect(triple).toEqual({
      a: 5,
      b: 6,
      c: 7,
      kind: "LONG",
      group: 3,
      slot: 1,
    });
  });

  it("prefers the lowest-ranked three without a recent triple", () => {
    // Teams 6 and 7 have already had a triple, so the next-lowest without one
    // (4,5) join the lowest remaining (there aren't 3 fresh below, so scan up):
    // bottom-up eligible are 5,4,3 -> triple {3,4,5}.
    const { triple } = drawSwissTeamsRound({
      teams: 7,
      standings: [1, 2, 3, 4, 5, 6, 7],
      playedOpponents: new Set(),
      oddRound: "SHORT",
      hadTriple: new Set([6, 7]),
    });
    expect(triple).toMatchObject({ a: 3, b: 4, c: 5, kind: "SHORT" });
  });

  it("tops up from the bottom when fewer than three teams lack a triple", () => {
    // Only team 1 has no prior triple; top up with the lowest remaining.
    const { triple } = drawSwissTeamsRound({
      teams: 5,
      standings: [1, 2, 3, 4, 5],
      playedOpponents: new Set(),
      oddRound: "SHORT",
      hadTriple: new Set([2, 3, 4, 5]),
    });
    // team 1 (fresh) + bottom-up remaining 5,4 -> {1,4,5}.
    expect(triple).toMatchObject({ a: 1, b: 4, c: 5, kind: "SHORT" });
  });

  it("reports a null triple for an even field even under a triple entry", () => {
    const { byeTeamId, triple } = drawSwissTeamsRound({
      teams: 4,
      standings: [1, 2, 3, 4],
      playedOpponents: new Set(),
      oddRound: "SHORT",
    });
    expect(byeTeamId).toBeNull();
    expect(triple).toBeNull();
  });
});

describe("roundOddResolution", () => {
  it("is always a bye when handling is not TRIPLE", () => {
    expect(roundOddResolution("BYE", undefined, 1)).toBe("BYE");
    expect(roundOddResolution(undefined, ["SHORT"], 1)).toBe("BYE");
  });

  it("reads the per-round plan entry for a TRIPLE event (1-indexed)", () => {
    const plan = [
      "BYE",
      "SHORT",
      { kind: "LONG", group: 1 },
    ] as const;
    expect(roundOddResolution("TRIPLE", plan, 1)).toBe("BYE");
    expect(roundOddResolution("TRIPLE", plan, 2)).toBe("SHORT");
    expect(roundOddResolution("TRIPLE", plan, 3)).toEqual({
      kind: "LONG",
      group: 1,
    });
  });

  it("falls back to a bye when the plan is missing or too short", () => {
    expect(roundOddResolution("TRIPLE", undefined, 1)).toBe("BYE");
    expect(roundOddResolution("TRIPLE", ["SHORT"], 2)).toBe("BYE");
  });
});

describe("expandTeamTriple", () => {
  it("yields the three head-to-head comparisons x-y/A, y-z/B, z-x/C", () => {
    const comparisons = expandTeamTriple({
      a: 5,
      b: 6,
      c: 7,
      kind: "SHORT",
      group: null,
      slot: null,
    });

    expect(comparisons).toEqual([
      {
        low: 5,
        high: 6,
        boardSet: "A",
        rows: [
          { tableNumber: 5, nsTeam: 5, ewTeam: 6 },
          { tableNumber: 6, nsTeam: 6, ewTeam: 5 },
        ],
      },
      {
        low: 6,
        high: 7,
        boardSet: "B",
        rows: [
          { tableNumber: 6, nsTeam: 6, ewTeam: 7 },
          { tableNumber: 7, nsTeam: 7, ewTeam: 6 },
        ],
      },
      {
        low: 5,
        high: 7,
        boardSet: "C",
        rows: [
          { tableNumber: 7, nsTeam: 7, ewTeam: 5 },
          { tableNumber: 5, nsTeam: 5, ewTeam: 7 },
        ],
      },
    ]);
  });

  it("covers all three pairings exactly once (full round-robin)", () => {
    const comparisons = expandTeamTriple({
      a: 1,
      b: 2,
      c: 3,
      kind: "LONG",
      group: 1,
      slot: 1,
    });
    const edges = comparisons
      .map((c) => `${c.low}-${c.high}`)
      .sort();
    expect(edges).toEqual(["1-2", "1-3", "2-3"]);
    // Each comparison is two rooms (open + closed) of the same two teams.
    for (const c of comparisons) {
      expect(c.rows).toHaveLength(2);
      const teamsInRooms = new Set(
        c.rows.flatMap((r) => [r.nsTeam, r.ewTeam]),
      );
      expect([...teamsInRooms].sort()).toEqual([c.low, c.high]);
    }
  });
});

describe("continueLongTriple", () => {
  it("advances a long triple to slot 2, keeping its teams and group", () => {
    const first = {
      a: 5,
      b: 6,
      c: 7,
      kind: "LONG" as const,
      group: 4,
      slot: 1 as const,
    };
    expect(continueLongTriple(first)).toEqual({
      a: 5,
      b: 6,
      c: 7,
      kind: "LONG",
      group: 4,
      slot: 2,
    });
  });
});

describe("expandTeamMatches", () => {
  it("places each match's two tables open/closed with home NS and away EW", () => {
    const placements = expandTeamMatches([
      { a: 1, b: 3 },
      { a: 2, b: 4 },
    ]);

    // One placement per team's home table, ascending.
    expect(placements.map((p) => p.tableNumber)).toEqual([1, 2, 3, 4]);

    // Table 1 is team 1's home: team 1 NS, team 3's away pair EW.
    expect(placements.find((p) => p.tableNumber === 1)).toEqual({
      tableNumber: 1,
      nsTeam: 1,
      ewTeam: 3,
    });
    // Table 3 is team 3's home: team 3 NS, team 1's away pair EW.
    expect(placements.find((p) => p.tableNumber === 3)).toEqual({
      tableNumber: 3,
      nsTeam: 3,
      ewTeam: 1,
    });
  });
});

describe("roundTeamIds", () => {
  it("collects match, bye and triple team ids", () => {
    expect(
      roundTeamIds({
        matches: [
          { a: 1, b: 2 },
          { a: 3, b: 4 },
        ],
        byeTeamId: null,
        triple: null,
      }).sort((x, y) => x - y),
    ).toEqual([1, 2, 3, 4]);

    expect(
      roundTeamIds({
        matches: [{ a: 1, b: 2 }],
        byeTeamId: 5,
        triple: null,
      }).sort((x, y) => x - y),
    ).toEqual([1, 2, 5]);

    expect(
      roundTeamIds({
        matches: [{ a: 1, b: 2 }],
        byeTeamId: null,
        triple: { a: 3, b: 4, c: 5 },
      }).sort((x, y) => x - y),
    ).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("swapTeams", () => {
  const round = (): SwissTeamsRound => ({
    matches: [
      { a: 1, b: 2 },
      { a: 3, b: 4 },
    ],
    byeTeamId: null,
    triple: null,
  });

  it("exchanges two teams between matches and re-normalises", () => {
    // Swap team 2 (in match 1-2) with team 3 (in match 3-4).
    const result = swapTeams(round(), 2, 3);
    expect(result.matches).toEqual([
      { a: 1, b: 3 },
      { a: 2, b: 4 },
    ]);
  });

  it("keeps each team placed exactly once after a swap", () => {
    const result = swapTeams(round(), 1, 4);
    expect(roundTeamIds(result).sort((x, y) => x - y)).toEqual([1, 2, 3, 4]);
  });

  it("swapping a match team with the bye changes who sits out", () => {
    const r: SwissTeamsRound = {
      matches: [{ a: 1, b: 2 }],
      byeTeamId: 3,
      triple: null,
    };
    // Team 2 sits out; team 3 comes in to play team 1.
    const result = swapTeams(r, 2, 3);
    expect(result.byeTeamId).toBe(2);
    expect(result.matches).toEqual([{ a: 1, b: 3 }]);
  });

  it("swapping into the triple reshapes it and re-normalises to ascending", () => {
    const r: SwissTeamsRound = {
      matches: [{ a: 1, b: 2 }],
      byeTeamId: null,
      triple: { a: 3, b: 4, c: 5 },
    };
    // Swap team 1 (match) with team 5 (triple).
    const result = swapTeams(r, 1, 5);
    expect(result.matches).toEqual([{ a: 2, b: 5 }]);
    expect(result.triple).toEqual({ a: 1, b: 3, c: 4 });
  });

  it("returns an unchanged deep copy when a team is not in the round", () => {
    const r = round();
    const result = swapTeams(r, 1, 99);
    expect(result).toEqual(r);
    expect(result.matches).not.toBe(r.matches);
  });

  it("returns an unchanged deep copy when swapping a team with itself", () => {
    const r = round();
    const result = swapTeams(r, 2, 2);
    expect(result).toEqual(r);
    expect(result.matches[0]).not.toBe(r.matches[0]);
  });
});

describe("evaluateSwissTeamsRound", () => {
  it("reports no problems for a clean full field", () => {
    const advisories = evaluateSwissTeamsRound(
      {
        matches: [
          { a: 1, b: 2 },
          { a: 3, b: 4 },
        ],
        byeTeamId: null,
        triple: null,
      },
      { teams: 4, playedOpponents: [] },
    );
    expect(advisories.structuralError).toBe(false);
    expect(advisories.repeats).toEqual([]);
    expect(advisories.hadUnavoidableRepeat).toBe(false);
  });

  it("flags a match that repeats an earlier opponent", () => {
    const advisories = evaluateSwissTeamsRound(
      {
        matches: [
          { a: 1, b: 2 },
          { a: 3, b: 4 },
        ],
        byeTeamId: null,
        triple: null,
      },
      { teams: 4, playedOpponents: ["1-2"] },
    );
    expect(advisories.repeats).toEqual(["1-2"]);
    expect(advisories.hadUnavoidableRepeat).toBe(true);
    expect(advisories.structuralError).toBe(false);
  });

  it("checks each of a triple's three edges for a repeat", () => {
    const advisories = evaluateSwissTeamsRound(
      {
        matches: [{ a: 1, b: 2 }],
        byeTeamId: null,
        triple: { a: 3, b: 4, c: 5 },
      },
      { teams: 5, playedOpponents: ["4-5"] },
    );
    expect(advisories.repeats).toEqual(["4-5"]);
    expect(advisories.hadUnavoidableRepeat).toBe(true);
  });

  it("reports a structural error when a team is placed twice or missing", () => {
    const advisories = evaluateSwissTeamsRound(
      {
        // Team 2 placed twice; team 4 missing.
        matches: [
          { a: 1, b: 2 },
          { a: 2, b: 3 },
        ],
        byeTeamId: null,
        triple: null,
      },
      { teams: 4, playedOpponents: [] },
    );
    expect(advisories.structuralError).toBe(true);
    expect(advisories.structuralReasons).toContain(
      "Team 2 is placed more than once",
    );
    expect(advisories.structuralReasons).toContain("Team 4 is not placed");
  });

  it("reports an unknown team id as a structural error", () => {
    const advisories = evaluateSwissTeamsRound(
      {
        matches: [
          { a: 1, b: 2 },
          { a: 3, b: 9 },
        ],
        byeTeamId: null,
        triple: null,
      },
      { teams: 4, playedOpponents: [] },
    );
    expect(advisories.structuralError).toBe(true);
    expect(advisories.structuralReasons).toContain("Unknown team 9 is placed");
  });
});
