import { describe, it, expect } from "vitest";
import { validateTeamsStructure } from "./teams-structure";

const ok = { canStart: true, sitOutSeat: null, problems: [] };

describe("validateTeamsStructure", () => {
  it("rejects an odd team count with no odd handling", () => {
    const result = validateTeamsStructure(ok, 5, {
      label: "Teams",
    });
    expect(result.canStart).toBe(false);
    expect(result.problems.map((p) => p.code)).toEqual(["ODD_TEAM_COUNT"]);
  });

  it("accepts any team count for a movement that fills every table", () => {
    expect(
      validateTeamsStructure(ok, 5, { label: "Teams", anyTeamCount: true }),
    ).toEqual(ok);
  });

  it("still rejects a sit-out when any team count is allowed", () => {
    const result = validateTeamsStructure({ ...ok, sitOutSeat: "A3EW" }, 5, {
      label: "Teams",
      anyTeamCount: true,
    });
    expect(result.problems.map((p) => p.code)).toEqual([
      "TEAMS_SIT_OUT_NOT_ALLOWED",
    ]);
  });
});
