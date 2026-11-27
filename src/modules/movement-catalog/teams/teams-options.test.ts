import { describe, it, expect } from "vitest";
import {
  americanWhistOptions,
  americanWhistPreview,
  teamsMovementOptions,
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
