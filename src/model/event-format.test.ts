import { describe, it, expect } from "vitest";
import { classifyEvent } from "./event-format";
import type { SelectedMovement } from "@/model/selected-movement";

const SPEC: SelectedMovement = { source: "SPEC", specId: 1, boardsPerRound: 2 };
const MITCHELL: SelectedMovement = {
  source: "MITCHELL",
  mitchell: { tables: 4, rounds: 4, boardsPerRound: 2 },
};
const SWISS: SelectedMovement = {
  source: "SWISS",
  swiss: { tables: 4, rounds: 4, boardsPerRound: 2 },
};
const SWISS_TEAMS: SelectedMovement = {
  source: "SWISS_TEAMS",
  swissTeams: { teams: 4, rounds: 4, boardsPerRound: 2 },
};

describe("classifyEvent", () => {
  it("classifies a pairs game with no movement as PAIRS_BOARD", () => {
    expect(classifyEvent("PAIRS", "MP", null)).toEqual({
      format: "PAIRS_BOARD",
      scoringType: "MP",
      swissVpMode: null,
    });
  });

  it("classifies a pairs SPEC movement as PAIRS_BOARD", () => {
    expect(classifyEvent("PAIRS", "MP", SPEC).format).toBe("PAIRS_BOARD");
  });

  it("classifies a pairs MITCHELL movement as PAIRS_BOARD", () => {
    expect(classifyEvent("PAIRS", "MP", MITCHELL).format).toBe("PAIRS_BOARD");
  });

  it("classifies a Swiss Pairs MP game as SWISS_PAIRS_VP with MP mode", () => {
    expect(classifyEvent("PAIRS", "MP", SWISS)).toEqual({
      format: "SWISS_PAIRS_VP",
      scoringType: "MP",
      swissVpMode: "MP",
    });
  });

  it("classifies a Swiss Pairs IMP game as SWISS_PAIRS_VP with IMP mode", () => {
    expect(classifyEvent("PAIRS", "IMP", SWISS)).toEqual({
      format: "SWISS_PAIRS_VP",
      scoringType: "IMP",
      swissVpMode: "IMP",
    });
  });

  it("classifies a Swiss Pairs XIMP game as SWISS_PAIRS_VP with null mode", () => {
    // Edge case: still the Swiss path, but XIMP has no VP mapping, so the
    // leaderboard falls back to the board-pooled overall (swissVpMode null).
    expect(classifyEvent("PAIRS", "XIMP", SWISS)).toEqual({
      format: "SWISS_PAIRS_VP",
      scoringType: "XIMP",
      swissVpMode: null,
    });
  });

  it("classifies a Teams + Swiss Teams game as SWISS_TEAMS_VP with null mode", () => {
    expect(classifyEvent("TEAMS", "IMP", SWISS_TEAMS)).toEqual({
      format: "SWISS_TEAMS_VP",
      scoringType: "IMP",
      swissVpMode: null,
    });
  });

  it("classifies a TEAMS game whose movement is not Swiss Teams as PAIRS_BOARD", () => {
    // Edge case: the TEAMS game type alone does not imply the teams format —
    // the movement must also be Swiss Teams.
    expect(classifyEvent("TEAMS", "IMP", SPEC).format).toBe("PAIRS_BOARD");
    expect(classifyEvent("TEAMS", "IMP", null).format).toBe("PAIRS_BOARD");
  });

  it("leaves swissVpMode null for PAIRS_BOARD regardless of scoring type", () => {
    for (const scoring of ["MP", "IMP", "XIMP"] as const) {
      expect(classifyEvent("PAIRS", scoring, SPEC).swissVpMode).toBeNull();
    }
  });

  it("leaves swissVpMode null for SWISS_TEAMS_VP regardless of scoring type", () => {
    for (const scoring of ["MP", "IMP", "XIMP"] as const) {
      expect(
        classifyEvent("TEAMS", scoring, SWISS_TEAMS).swissVpMode,
      ).toBeNull();
    }
  });
});
