import { describe, it, expect } from "vitest";
import { declaredScoreBreakRounds } from "./score-breaks";

describe("declaredScoreBreakRounds", () => {
  it("scores a head-to-head up between its two stanzas", () => {
    expect(
      declaredScoreBreakRounds({
        source: "HEAD_TO_HEAD_TEAMS",
        headToHeadTeams: { boardsPerRound: 12 },
      }),
    ).toEqual([1]);
  });
  it("declares none for other movements, or none selected", () => {
    expect(
      declaredScoreBreakRounds({
        source: "AMERICAN_WHIST_TEAMS",
        americanWhistTeams: { teams: 5, boardsPerRound: 3 },
      }),
    ).toEqual([]);
    expect(declaredScoreBreakRounds(null)).toEqual([]);
  });
});
