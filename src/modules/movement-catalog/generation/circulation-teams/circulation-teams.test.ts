import { describe, it, expect } from "vitest";
import {
  CIRCULATION_ROUNDS,
  CIRCULATION_TEAMS,
  generateCirculationTeams,
} from "./circulation-teams";

describe("generateCirculationTeams", () => {
  const { tables } = generateCirculationTeams({ boardsPerRound: 8 });

  it("seats four home teams for three rounds", () => {
    expect(CIRCULATION_TEAMS).toBe(4);
    expect(CIRCULATION_ROUNDS).toBe(3);
    expect(tables.map((t) => t.table)).toEqual([1, 2, 3, 4]);
    for (const t of tables) {
      expect(t.rounds.map((r) => r.round)).toEqual([1, 2, 3]);
      for (const r of t.rounds)
        expect(r.participants.nsId).toBe(`${t.table}NS`);
    }
  });

  it("plays 1v2 and 3v4, then 1v3 and 2v4, then 1v4 and 2v3", () => {
    const visitors = tables.map((t) =>
      t.rounds.map((r) => r.participants.ewId),
    );
    expect(visitors).toEqual([
      ["2EW", "3EW", "4EW"],
      ["1EW", "4EW", "3EW"],
      ["4EW", "1EW", "2EW"],
      ["3EW", "2EW", "1EW"],
    ]);
  });

  it("starts each table on its own quarter of the round's boards, passing them down a table", () => {
    expect(tables.map((t) => t.rounds[0].boards)).toEqual([
      [1, 2, 3, 4, 5, 6, 7, 8],
      [3, 4, 5, 6, 7, 8, 1, 2],
      [5, 6, 7, 8, 1, 2, 3, 4],
      [7, 8, 1, 2, 3, 4, 5, 6],
    ]);
  });

  it("gives every round eight new boards", () => {
    expect(tables[1].rounds[1].boards).toEqual([11, 12, 13, 14, 15, 16, 9, 10]);
    expect(tables[0].rounds[2].boards).toEqual([
      17, 18, 19, 20, 21, 22, 23, 24,
    ]);
  });

  it("shares a round of four boards out one to a table", () => {
    const small = generateCirculationTeams({ boardsPerRound: 4 });
    expect(small.tables.map((t) => t.rounds[0].boards)).toEqual([
      [1, 2, 3, 4],
      [2, 3, 4, 1],
      [3, 4, 1, 2],
      [4, 1, 2, 3],
    ]);
  });

  it.each([0, 6, 2.5, -4])("rejects %s boards per round", (boardsPerRound) => {
    expect(() => generateCirculationTeams({ boardsPerRound })).toThrow(
      /multiple of 4/,
    );
  });
});
