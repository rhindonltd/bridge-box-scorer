import { describe, it, expect } from "vitest";
import {
  generateStaggerTeams,
  isStaggerTeamCount,
  staggerTeamsRounds,
} from "./stagger-teams";

/** Every room of a generated Stagger, with its board set. */
function rooms(teams: number) {
  return generateStaggerTeams({ teams, boardsPerRound: 1 }).tables.flatMap(
    (table) =>
      table.rounds.map((round) => ({
        table: table.table,
        round: round.round,
        home: parseInt(round.participants.nsId, 10),
        visitor: parseInt(round.participants.ewId, 10),
        set: round.boards[0],
        sharesWith: round.sharesWith,
      })),
  );
}

describe("isStaggerTeamCount", () => {
  it("allows even counts of at least 4", () => {
    expect([4, 6, 8, 10, 16].every(isStaggerTeamCount)).toBe(true);
    expect([2, 5, 7, 4.5].some(isStaggerTeamCount)).toBe(false);
  });
  it("plays teams − 1 rounds", () => {
    expect(staggerTeamsRounds(8)).toBe(7);
  });
});

describe("generateStaggerTeams", () => {
  it.each([4, 6, 8, 10, 12, 14, 16, 18])(
    "%i teams: the four Stagger invariants, and every match on one set",
    (teams) => {
      const all = rooms(teams);
      const half = teams / 2;
      const at = (table: number, round: number) =>
        all.find((r) => r.table === table && r.round === round)!;
      // 1. No self-play, and every table filled every round.
      for (const room of all) {
        expect(room.home).toBe(room.table);
        expect(room.visitor).not.toBe(room.home);
      }
      for (let round = 1; round < teams; round++) {
        const visitors = all
          .filter((r) => r.round === round)
          .map((r) => r.visitor);
        expect(new Set(visitors).size).toBe(teams);
      }
      // 2. Table t and table t + M play the same set, and say so.
      for (const room of all) {
        const partner = ((room.table - 1 + half) % teams) + 1;
        expect(room.sharesWith).toBe(partner);
        expect(at(partner, room.round).set).toBe(room.set);
      }
      // 3. Every team's North/South pair meets every other East/West pair once.
      const meetings = new Set(all.map((r) => `${r.home}|${r.visitor}`));
      expect(meetings.size).toBe(teams * (teams - 1));
      // 4. Each team plays teams − 1 distinct sets as North/South, and the same
      // sets as East/West.
      for (let team = 1; team <= teams; team++) {
        const ns = all.filter((r) => r.home === team).map((r) => r.set);
        const ew = all.filter((r) => r.visitor === team).map((r) => r.set);
        expect(new Set(ns).size).toBe(teams - 1);
        expect([...ew].sort((a, b) => a - b)).toEqual(
          [...ns].sort((a, b) => a - b),
        );
      }
      // Two teams' two rooms play the same set: an ordinary teams match.
      const roomSet = new Map(
        all.map((r) => [`${r.home}|${r.visitor}`, r.set]),
      );
      for (const room of all) {
        expect(roomSet.get(`${room.visitor}|${room.home}`)).toBe(room.set);
      }
    },
  );

  it("plays stanza 1 on sets 1 … M and stanza 2 on sets M + 1 … T", () => {
    const all = rooms(8);
    const sets = (from: number, to: number) =>
      new Set(
        all.filter((r) => r.round >= from && r.round <= to).map((r) => r.set),
      );
    expect(sets(1, 3)).toEqual(new Set([1, 2, 3, 4]));
    expect(sets(4, 7)).toEqual(new Set([5, 6, 7, 8]));
  });

  it("applies the boards per round to each set", () => {
    const { tables } = generateStaggerTeams({ teams: 6, boardsPerRound: 4 });
    // Table 2, round 1: set 2.
    expect(tables[1].rounds[0].boards).toEqual([5, 6, 7, 8]);
  });

  it.each([2, 5])("rejects %i teams", (teams) => {
    expect(() => generateStaggerTeams({ teams, boardsPerRound: 2 })).toThrow(
      /Stagger needs/,
    );
  });

  it.each([0, 1.5])("rejects %s boards per round", (boardsPerRound) => {
    expect(() => generateStaggerTeams({ teams: 6, boardsPerRound })).toThrow(
      /boardsPerRound/,
    );
  });
});
