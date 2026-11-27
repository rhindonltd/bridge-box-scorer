import { describe, it, expect } from "vitest";
import {
  expectedRounds,
  boardsPerRoundOf,
  SelectedMovement,
} from "./selected-movement";

describe("expectedRounds", () => {
  it("returns null for no movement", () => {
    expect(expectedRounds(null)).toBeNull();
  });

  it("reads the round count from a MITCHELL spec", () => {
    const m: SelectedMovement = {
      source: "MITCHELL",
      mitchell: { tables: 5, rounds: 8, boardsPerRound: 3 },
    };
    expect(expectedRounds(m)).toBe(8);
  });

  it("reads the round count from a SWISS spec", () => {
    const m: SelectedMovement = {
      source: "SWISS",
      swiss: { tables: 5, rounds: 7, boardsPerRound: 7 },
    };
    expect(expectedRounds(m)).toBe(7);
  });

  it("reads the round count from a SWISS_TEAMS spec", () => {
    const m: SelectedMovement = {
      source: "SWISS_TEAMS",
      swissTeams: { teams: 6, rounds: 9, boardsPerRound: 6 },
    };
    expect(expectedRounds(m)).toBe(9);
  });

  it("plays every round of an American Whist (teams − 1)", () => {
    const m: SelectedMovement = {
      source: "AMERICAN_WHIST_TEAMS",
      americanWhistTeams: { teams: 7, boardsPerRound: 3 },
    };
    expect(expectedRounds(m)).toBe(6);
  });

  it("plays every round of a Thurner (teams − 1)", () => {
    const m: SelectedMovement = {
      source: "THURNER_TEAMS",
      thurnerTeams: { teams: 8, boardsPerRound: 3 },
    };
    expect(expectedRounds(m)).toBe(7);
    expect(boardsPerRoundOf(m)).toBe(3);
  });
  it("plays every round of a Stagger (teams − 1)", () => {
    const m: SelectedMovement = {
      source: "STAGGER_TEAMS",
      staggerTeams: { teams: 6, boardsPerRound: 4 },
    };
    expect(expectedRounds(m)).toBe(5);
    expect(boardsPerRoundOf(m)).toBe(4);
  });
  it("plays two stanzas of a head-to-head", () => {
    const m: SelectedMovement = {
      source: "HEAD_TO_HEAD_TEAMS",
      headToHeadTeams: { boardsPerRound: 12 },
    };
    expect(expectedRounds(m)).toBe(2);
    expect(boardsPerRoundOf(m)).toBe(12);
  });
  it("plays three rounds of a Circulation", () => {
    const m: SelectedMovement = {
      source: "CIRCULATION_TEAMS",
      circulationTeams: { boardsPerRound: 8 },
    };
    expect(expectedRounds(m)).toBe(3);
  });
  it("returns null for a SPEC selection (no round count in the stored selection)", () => {
    const m: SelectedMovement = {
      source: "SPEC",
      specId: 42,
      boardsPerRound: 4,
    };
    expect(expectedRounds(m)).toBeNull();
  });
});

describe("boardsPerRoundOf", () => {
  it("returns null for no movement", () => {
    expect(boardsPerRoundOf(null)).toBeNull();
  });

  it("reads boards-per-round from a MITCHELL spec", () => {
    const m: SelectedMovement = {
      source: "MITCHELL",
      mitchell: { tables: 5, rounds: 8, boardsPerRound: 3 },
    };
    expect(boardsPerRoundOf(m)).toBe(3);
  });

  it("reads boards-per-round from a SWISS spec", () => {
    const m: SelectedMovement = {
      source: "SWISS",
      swiss: { tables: 5, rounds: 7, boardsPerRound: 7 },
    };
    expect(boardsPerRoundOf(m)).toBe(7);
  });

  it("reads boards-per-round from a nested SWISS_TEAMS spec", () => {
    const m: SelectedMovement = {
      source: "SWISS_TEAMS",
      swissTeams: { teams: 6, rounds: 9, boardsPerRound: 6 },
    };
    expect(boardsPerRoundOf(m)).toBe(6);
  });

  it("reads boards-per-round from a nested AMERICAN_WHIST_TEAMS spec", () => {
    const m: SelectedMovement = {
      source: "AMERICAN_WHIST_TEAMS",
      americanWhistTeams: { teams: 5, boardsPerRound: 2 },
    };
    expect(boardsPerRoundOf(m)).toBe(2);
  });

  it("reads boards-per-round from a nested CIRCULATION_TEAMS spec", () => {
    const m: SelectedMovement = {
      source: "CIRCULATION_TEAMS",
      circulationTeams: { boardsPerRound: 12 },
    };
    expect(boardsPerRoundOf(m)).toBe(12);
  });
  it("reads the top-level boards-per-round from a SPEC selection", () => {
    const m: SelectedMovement = {
      source: "SPEC",
      specId: 42,
      boardsPerRound: 4,
    };
    expect(boardsPerRoundOf(m)).toBe(4);
  });
});
