import { describe, it, expect } from "vitest";
import {
  boardsSinceScoreBreak,
  scoreBreakRounds,
  teamOfPair,
  type TeamMatchRounds,
} from "./score-breaks";
import type { ScheduleRound } from "./schedule";

function match(
  home: string,
  opponent: string | null,
  firstRound: number,
  lastRound: number,
): TeamMatchRounds {
  return { home, opponent, firstRound, lastRound };
}

describe("teamOfPair", () => {
  it("maps a team's away pair to its home-NS id", () => {
    expect(teamOfPair("A3EW")).toBe("A3NS");
  });
  it("leaves the home pair's id as it is", () => {
    expect(teamOfPair("A3NS")).toBe("A3NS");
  });
});

describe("scoreBreakRounds", () => {
  it("breaks after every round when each round is a whole match", () => {
    const matches = [
      match("A1NS", "A2NS", 1, 1),
      match("A3NS", "A4NS", 1, 1),
      match("A1NS", "A3NS", 2, 2),
      match("A1NS", "A4NS", 3, 3),
    ];
    expect(scoreBreakRounds(matches, "A1NS")).toEqual(new Set([1, 2, 3]));
  });

  it("breaks only once every match the team has started is finished", () => {
    // An American Whist of 3 teams: each match's rooms are in rounds 1 and 2.
    const matches = [
      match("A1NS", "A2NS", 1, 2),
      match("A1NS", "A3NS", 1, 2),
      match("A2NS", "A3NS", 1, 2),
    ];
    expect(scoreBreakRounds(matches, "A1NS")).toEqual(new Set([2]));
  });

  it("reads the team from either side of a match, and ignores other teams' matches", () => {
    const matches = [
      match("A1NS", "A2NS", 1, 1),
      match("A2NS", "A3NS", 2, 3),
      match("A3NS", "A4NS", 1, 1),
    ];
    expect(scoreBreakRounds(matches, "A2NS")).toEqual(new Set([1, 3]));
  });

  it("has no break after a round while one of the team's matches is part-played", () => {
    const matches = [match("A1NS", "A2NS", 1, 1), match("A1NS", "A3NS", 1, 2)];
    expect(scoreBreakRounds(matches, "A1NS")).toEqual(new Set([2]));
  });

  it("counts a bye as a match the team finishes in its round", () => {
    expect(scoreBreakRounds([match("A5NS", null, 2, 2)], "A5NS")).toEqual(
      new Set([2]),
    );
  });

  it("has no breaks for a team with no matches (a pairs game)", () => {
    expect(scoreBreakRounds([], "A1NS")).toEqual(new Set());
  });
});

describe("boardsSinceScoreBreak", () => {
  function round(boards: number[], scoreBreakAfter?: boolean): ScheduleRound {
    return {
      roundNumber: 0,
      tableNumber: 1,
      boards,
      boardStatuses: [],
      players: { N: null, S: null, E: null, W: null },
      scoreBreakAfter,
    };
  }

  it("gathers the boards back to the previous break", () => {
    const rounds = [
      round([1, 2], true),
      round([3, 4]),
      round([5, 6], true),
      round([7, 8], true),
    ];
    expect(boardsSinceScoreBreak(rounds, 2)).toEqual([3, 4, 5, 6]);
    expect(boardsSinceScoreBreak(rounds, 3)).toEqual([7, 8]);
  });

  it("gathers from the first round when there is no earlier break", () => {
    const rounds = [round([1, 2]), round([3, 4], true)];
    expect(boardsSinceScoreBreak(rounds, 1)).toEqual([1, 2, 3, 4]);
  });
});
