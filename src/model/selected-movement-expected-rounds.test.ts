import { describe, it, expect } from "vitest";
import { expectedRounds, SelectedMovement } from "./selected-movement";

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

  it("reads the round count from a ROUND_ROBIN_TEAMS spec", () => {
    const m: SelectedMovement = {
      source: "ROUND_ROBIN_TEAMS",
      roundRobinTeams: { teams: 6, rounds: 5, boardsPerRound: 6 },
    };
    expect(expectedRounds(m)).toBe(5);
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
