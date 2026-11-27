import { describe, it, expect } from "vitest";
import type { Tables } from "@/model/movement";
import {
  americanWhistTeamsRounds,
  generateAmericanWhistTeams,
  isAmericanWhistTeamCount,
} from "./american-whist-teams";

/** Each table's rounds as [home, visitor, board set] triples. */
function triples(tables: Tables, boardsPerRound: number): number[][] {
  return tables.tables.map((table) =>
    table.rounds.flatMap((round) => [
      parseInt(round.participants.nsId, 10),
      parseInt(round.participants.ewId, 10),
      (round.boards[0] - 1) / boardsPerRound + 1,
    ]),
  );
}

describe("generateAmericanWhistTeams", () => {
  it("matches the NBL 5-team American Whist (EW down 2, boards down 1)", () => {
    // TSMovements.txt: "American Whist - 4 Matches 5 Boards (NBL T8 …)".
    expect(
      triples(generateAmericanWhistTeams({ teams: 5, boardsPerRound: 5 }), 5),
    ).toEqual([
      [1, 3, 1, 1, 5, 2, 1, 2, 3, 1, 4, 4],
      [2, 4, 2, 2, 1, 3, 2, 3, 4, 2, 5, 5],
      [3, 5, 3, 3, 2, 4, 3, 4, 5, 3, 1, 1],
      [4, 1, 4, 4, 3, 5, 4, 5, 1, 4, 2, 2],
      [5, 2, 5, 5, 4, 1, 5, 1, 2, 5, 3, 3],
    ]);
  });

  it("matches the NBL 7-team American Whist", () => {
    // TSMovements.txt: "American Whist - 6 Matches 4 Boards (NBL T8 Session 1)".
    expect(
      triples(generateAmericanWhistTeams({ teams: 7, boardsPerRound: 4 }), 4),
    ).toEqual([
      [1, 3, 1, 1, 5, 2, 1, 7, 3, 1, 2, 4, 1, 4, 5, 1, 6, 6],
      [2, 4, 2, 2, 6, 3, 2, 1, 4, 2, 3, 5, 2, 5, 6, 2, 7, 7],
      [3, 5, 3, 3, 7, 4, 3, 2, 5, 3, 4, 6, 3, 6, 7, 3, 1, 1],
      [4, 6, 4, 4, 1, 5, 4, 3, 6, 4, 5, 7, 4, 7, 1, 4, 2, 2],
      [5, 7, 5, 5, 2, 6, 5, 4, 7, 5, 6, 1, 5, 1, 2, 5, 3, 3],
      [6, 1, 6, 6, 3, 7, 6, 5, 1, 6, 7, 2, 6, 2, 3, 6, 4, 4],
      [7, 2, 7, 7, 4, 1, 7, 6, 2, 7, 1, 3, 7, 3, 4, 7, 5, 5],
    ]);
  });

  it("has every team meet every other once, both rooms on one board set", () => {
    const teams = 9;
    const rooms = triples(
      generateAmericanWhistTeams({ teams, boardsPerRound: 3 }),
      3,
    ).flatMap((row) =>
      Array.from({ length: row.length / 3 }, (_, i) =>
        row.slice(i * 3, i * 3 + 3),
      ),
    );
    const setOf = new Map(rooms.map(([h, v, s]) => [`${h}-${v}`, s]));
    for (let a = 1; a <= teams; a++) {
      for (let b = 1; b <= teams; b++) {
        if (a === b) continue;
        expect(setOf.get(`${a}-${b}`)).toBeDefined();
        expect(setOf.get(`${a}-${b}`)).toBe(setOf.get(`${b}-${a}`));
      }
    }
    expect(rooms).toHaveLength(teams * americanWhistTeamsRounds(teams));
  });

  it("uses one copy of each board set: one table per set each round", () => {
    const tables = generateAmericanWhistTeams({ teams: 5, boardsPerRound: 2 });
    for (let round = 0; round < 4; round++) {
      const firsts = tables.tables.map((t) => t.rounds[round].boards[0]);
      expect(new Set(firsts).size).toBe(5);
    }
    expect(tables.tables[0].rounds[0].boards).toEqual([1, 2]);
  });

  it("needs an odd team count of at least 3", () => {
    expect(() =>
      generateAmericanWhistTeams({ teams: 4, boardsPerRound: 2 }),
    ).toThrow(/odd number of teams/);
    expect(() =>
      generateAmericanWhistTeams({ teams: 1, boardsPerRound: 2 }),
    ).toThrow(/odd number of teams/);
    expect(isAmericanWhistTeamCount(3)).toBe(true);
    expect(isAmericanWhistTeamCount(2.5)).toBe(false);
  });

  it("needs a positive whole number of boards per round", () => {
    expect(() =>
      generateAmericanWhistTeams({ teams: 3, boardsPerRound: 0 }),
    ).toThrow(/boardsPerRound/);
  });
});
