import { describe, it, expect } from "vitest";
import {
  americanWhistOptions,
  americanWhistPreview,
  circulationOptions,
  circulationPreview,
  circulationSetOut,
  teamsMovementOptions,
  staggerOptions,
  staggerPreview,
  thurnerOptions,
  thurnerPreview,
} from "./teams-options";

describe("americanWhistOptions", () => {
  it("offers American Whist at each boards per round giving 12–36 boards a team", () => {
    // 5 teams play 4 rounds: 3..9 boards a round gives 12..36 boards.
    const options = americanWhistOptions(5);
    expect(options.map((o) => o.boardsPerRound)).toEqual([3, 4, 5, 6, 7, 8, 9]);
    expect(options[0]).toEqual({
      name: "American Whist",
      rounds: 4,
      boardsPerRound: 3,
      boardsPerTeam: 12,
      boardsInPlay: 15,
      ref: { source: "americanWhist", spec: { teams: 5, boardsPerRound: 3 } },
    });
  });

  it("keeps to the boards-per-round range for a small field", () => {
    // 3 teams play 2 rounds: 6..12 boards a round (12..24 boards).
    expect(americanWhistOptions(3).map((o) => o.boardsPerRound)).toEqual([
      6, 7, 8, 9, 10, 11, 12,
    ]);
  });

  it("offers nothing for an even number of teams", () => {
    expect(americanWhistOptions(6)).toEqual([]);
  });
});

describe("teamsMovementOptions", () => {
  it("lists American Whist, then the library's movements", () => {
    const options = teamsMovementOptions(7, [
      {
        id: 9,
        name: "Stagger",
        tables: 7,
        boards: 28,
        boardsPerRound: 4,
        rounds: 6,
      },
    ]);
    expect(options.map((o) => o.ref.source)).toEqual([
      "americanWhist",
      "americanWhist",
      "americanWhist",
      "americanWhist",
      "americanWhist",
      "library",
    ]);
    expect(options.at(-1)).toEqual({
      name: "Stagger",
      rounds: 6,
      boardsPerRound: 4,
      boardsPerTeam: 24,
      boardsInPlay: 28,
      ref: { source: "library", id: 9 },
    });
  });
});

describe("americanWhistPreview", () => {
  it("shows each table's home and visiting team by number", () => {
    const [table1] = americanWhistPreview({ teams: 3, boardsPerRound: 2 });
    expect(table1.rounds.map((r) => [r.ns, r.ew, r.boardStart])).toEqual([
      ["1", "3", 1],
      ["1", "2", 3],
    ]);
  });
});
describe("circulationOptions", () => {
  it("offers Circulation for four teams at one to three boards a table", () => {
    const options = circulationOptions(4);
    expect(options.map((o) => o.boardsPerTeam)).toEqual([12, 24, 36]);
    expect(options[1]).toEqual({
      name: "Circulation",
      rounds: 3,
      boardsPerRound: 8,
      boardsPerTeam: 24,
      boardsInPlay: 24,
      ref: { source: "circulation", spec: { boardsPerRound: 8 } },
    });
  });
  it("offers nothing for another number of teams", () => {
    expect(circulationOptions(5)).toEqual([]);
  });
  it("is listed among a four-team game's options", () => {
    const sources = teamsMovementOptions(4, []).map((o) => o.ref.source);
    expect(sources.filter((s) => s === "circulation")).toHaveLength(3);
    expect(new Set(sources)).toEqual(new Set(["circulation", "stagger"]));
  });
});
describe("circulationPreview", () => {
  it("shows the round's boards and the teams at each table", () => {
    const tables = circulationPreview({ boardsPerRound: 8 });
    expect(
      tables[1].rounds.map((r) => [r.ns, r.ew, r.boardStart, r.boardEnd]),
    ).toEqual([
      ["2", "1", 1, 8],
      ["2", "4", 9, 16],
      ["2", "3", 17, 24],
    ]);
  });
});
describe("circulationSetOut", () => {
  it("sets out each table's own share of the round's boards", () => {
    const tables = circulationSetOut({ boardsPerRound: 8 });
    expect(
      tables.map((t) => [t.rounds[0].boardStart, t.rounds[0].boardEnd]),
    ).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
    ]);
    expect(tables[3].rounds[2]).toMatchObject({ boardStart: 23, boardEnd: 24 });
  });
});
describe("thurnerOptions", () => {
  it("offers Thurner at each boards per round giving 12–36 boards a team", () => {
    // 8 teams play 7 rounds: 2..5 boards a round gives 14..35 boards.
    const options = thurnerOptions(8);
    expect(options.map((o) => o.boardsPerRound)).toEqual([2, 3, 4, 5]);
    expect(options[0]).toEqual({
      name: "Thurner",
      rounds: 7,
      boardsPerRound: 2,
      boardsPerTeam: 14,
      boardsInPlay: 14,
      ref: { source: "thurner", spec: { teams: 8, boardsPerRound: 2 } },
    });
  });
  it("is offered for 6, 8 and 14 teams only", () => {
    for (const teams of [6, 8, 14]) {
      expect(thurnerOptions(teams).length).toBeGreaterThan(0);
    }
    // 12 and 18 teams have a Thurner but it is not recommended; 10 and 7 have
    // none.
    for (const teams of [12, 18, 10, 7]) {
      expect(thurnerOptions(teams)).toEqual([]);
    }
  });
  it("is listed among a six-team game's options", () => {
    expect(
      new Set(teamsMovementOptions(6, []).map((o) => o.ref.source)),
    ).toEqual(new Set(["thurner", "stagger"]));
  });
});
describe("thurnerPreview", () => {
  it("shows the satellite table on the boards it shares", () => {
    const tables = thurnerPreview({ teams: 6, boardsPerRound: 2 });
    expect(tables[5].rounds[0]).toEqual({
      roundNumber: 1,
      ns: "6",
      ew: "1",
      boardStart: 1,
      boardEnd: 2,
    });
  });
});
describe("staggerOptions", () => {
  it("offers Stagger at each boards per round giving 12–36 boards a team", () => {
    // 6 teams play 5 rounds: 3..7 boards a round gives 15..35 boards.
    const options = staggerOptions(6);
    expect(options.map((o) => o.boardsPerRound)).toEqual([3, 4, 5, 6, 7]);
    expect(options[0]).toEqual({
      name: "Stagger",
      rounds: 5,
      boardsPerRound: 3,
      boardsPerTeam: 15,
      boardsInPlay: 18,
      ref: { source: "stagger", spec: { teams: 6, boardsPerRound: 3 } },
    });
  });
  it("offers nothing for an odd number of teams", () => {
    expect(staggerOptions(5)).toEqual([]);
  });
});
describe("staggerPreview", () => {
  it("shows each table's home and visiting team by number", () => {
    const [table1] = staggerPreview({ teams: 4, boardsPerRound: 2 });
    expect(table1.rounds.map((r) => [r.ew, r.boardStart])).toEqual([
      ["3", 1],
      ["2", 5],
      ["4", 7],
    ]);
  });
});
