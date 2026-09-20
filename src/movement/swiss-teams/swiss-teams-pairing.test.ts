import { describe, it, expect } from "vitest";
import {
  drawSwissTeamsRound,
  expandTeamMatches,
  teamIds,
  swissTeamsRoundOne,
  teamOpponentKey,
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
