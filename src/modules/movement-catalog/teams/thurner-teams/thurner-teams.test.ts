import { describe, it, expect } from "vitest";
import {
  generateThurnerTeams,
  isThurnerTeamCount,
  thurnerTeamsRounds,
} from "./thurner-teams";

/** Every room of a generated Thurner as [table, round, home, visitor, set]. */
function rooms(teams: number) {
  return generateThurnerTeams({ teams, boardsPerRound: 1 }).tables.flatMap(
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

describe("isThurnerTeamCount", () => {
  it("allows even counts of at least 6 where teams − 1 is not a multiple of 3", () => {
    expect([6, 8, 12, 14, 18, 20].every(isThurnerTeamCount)).toBe(true);
    expect([2, 4, 5, 7, 10, 16, 22, 6.5].some(isThurnerTeamCount)).toBe(false);
  });
  it("plays teams − 1 rounds", () => {
    expect(thurnerTeamsRounds(8)).toBe(7);
  });
});

describe("generateThurnerTeams", () => {
  it.each([6, 8, 12, 14, 18, 20, 24, 26])(
    "%i teams: every team meets every other once, a match's two rooms on one set",
    (teams) => {
      const all = rooms(teams);
      const circuit = teams - 1;
      expect(all).toHaveLength(teams * (teams - 1));
      // Every table is filled every round, its home pair stays put, and no
      // team plays itself.
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
      // Each room has its other room on the same set, and two teams meet in
      // exactly two rooms.
      const key = (home: number, visitor: number, set: number) =>
        `${home}|${visitor}|${set}`;
      const keys = new Set(all.map((r) => key(r.home, r.visitor, r.set)));
      for (const room of all) {
        expect(keys.has(key(room.visitor, room.home, room.set))).toBe(true);
      }
      const meetings = new Map<string, number>();
      for (const { home, visitor } of all) {
        const pair = `${Math.min(home, visitor)}-${Math.max(home, visitor)}`;
        meetings.set(pair, (meetings.get(pair) ?? 0) + 1);
      }
      expect(meetings.size).toBe((teams * (teams - 1)) / 2);
      expect([...meetings.values()].every((n) => n === 2)).toBe(true);
      // Each team plays each of the circuit's sets once at home and once away.
      for (let team = 1; team <= teams; team++) {
        const home = all.filter((r) => r.home === team).map((r) => r.set);
        const away = all.filter((r) => r.visitor === team).map((r) => r.set);
        for (const sets of [home, away]) {
          expect([...sets].sort((a, b) => a - b)).toEqual(
            Array.from({ length: circuit }, (_, i) => i + 1),
          );
        }
      }
    },
  );

  it("moves the circuit's sets down a table each round", () => {
    const all = rooms(6);
    const at = (table: number, round: number) =>
      all.find((r) => r.table === table && r.round === round)!;
    expect([1, 2, 3, 4, 5].map((round) => at(2, round).set)).toEqual([
      2, 3, 4, 5, 1,
    ]);
  });

  it("shares the satellite's set with the table team 6's away pair visits", () => {
    const all = rooms(6);
    for (let round = 1; round <= 5; round++) {
      const satellite = all.find((r) => r.table === 6 && r.round === round)!;
      const shared = all.find((r) => r.visitor === 6 && r.round === round)!;
      expect(satellite.set).toBe(shared.set);
      expect(satellite.sharesWith).toBe(shared.table);
      expect(shared.sharesWith).toBe(6);
      // Nobody else shares this round.
      expect(
        all.filter((r) => r.round === round && r.sharesWith != null),
      ).toHaveLength(2);
    }
  });

  it("applies the boards per round to each set", () => {
    const { tables } = generateThurnerTeams({ teams: 6, boardsPerRound: 3 });
    expect(tables[1].rounds[0].boards).toEqual([4, 5, 6]);
  });

  it.each([4, 10, 7])("rejects %i teams", (teams) => {
    expect(() => generateThurnerTeams({ teams, boardsPerRound: 2 })).toThrow(
      /Thurner needs/,
    );
  });

  it.each([0, 1.5])("rejects %s boards per round", (boardsPerRound) => {
    expect(() => generateThurnerTeams({ teams: 6, boardsPerRound })).toThrow(
      /boardsPerRound/,
    );
  });
});
