import { describe, it, expect } from "vitest";
import { applyTeamWithdrawalRulings } from "./team-withdrawal";
import type { TeamMatchRow, TeamMatchStructureRow } from "./team-match";
import type { BoardOutcome } from "@/model/score";

/** A TEAMS match structure row (home = lower table), overridable. */
function teamsMatch(
  round: number,
  home: string,
  opponent: string,
  overrides: Partial<TeamMatchStructureRow> = {},
): TeamMatchStructureRow {
  return {
    section: "A",
    roundNumber: round,
    kind: "TEAMS",
    home,
    opponent,
    groupId: null,
    vpPool: 20,
    boardStart: 1,
    boardEnd: 2,
    ruling: null,
    ...overrides,
  };
}

/** A scored board row at a home table (its NS pair hosts). */
function board(
  round: number,
  boardNumber: number,
  ns: string,
  ew: string,
  outcome: BoardOutcome | null,
): TeamMatchRow {
  return {
    section: "A",
    roundNumber: round,
    boardNumber,
    ns,
    ew,
    confirmedResult: outcome,
    directorOverrideResult: null,
    status: "CONFIRMED",
  };
}

describe("applyTeamWithdrawalRulings", () => {
  it("returns the input unchanged when there are no withdrawals", () => {
    const matches = [teamsMatch(1, "A1NS", "A2NS")];
    const out = applyTeamWithdrawalRulings(matches, [], []);
    expect(out).toBe(matches);
  });

  it("voids an unplayed match where the home team withdrew (home AVE−)", () => {
    // Round 2: team A1 (withdrawn) drawn against A2, no boards played.
    const matches = [teamsMatch(2, "A1NS", "A2NS")];
    const out = applyTeamWithdrawalRulings(matches, [{ seat: "A1NS" }], []);
    expect(out[0].ruling).toBe("VOID:SHORT_OFFENDER_NS");
  });

  it("voids an unplayed match where the opponent team withdrew (opp AVE−)", () => {
    const matches = [teamsMatch(2, "A1NS", "A2NS")];
    const out = applyTeamWithdrawalRulings(matches, [{ seat: "A2NS" }], []);
    expect(out[0].ruling).toBe("VOID:SHORT_OFFENDER_EW");
  });

  it("leaves a PLAYED match alone even when a team has withdrawn", () => {
    // Both rooms of the A1 v A2 match played board 1 — the match stands.
    const matches = [teamsMatch(1, "A1NS", "A2NS")];
    const boards = [
      board(1, 1, "A1NS", "A2EW", "4SN=" as BoardOutcome),
      board(1, 1, "A2NS", "A1EW", "3NTN=" as BoardOutcome),
    ];
    const out = applyTeamWithdrawalRulings(matches, [{ seat: "A1NS" }], boards);
    expect(out[0].ruling).toBeNull();
  });

  it("never clobbers an existing director ruling", () => {
    const matches = [
      teamsMatch(2, "A1NS", "A2NS", { ruling: "VOID:SEATING_TD" }),
    ];
    const out = applyTeamWithdrawalRulings(matches, [{ seat: "A1NS" }], []);
    expect(out[0].ruling).toBe("VOID:SEATING_TD");
  });

  it("ignores matches not involving a withdrawn team", () => {
    const matches = [teamsMatch(2, "A3NS", "A4NS")];
    const out = applyTeamWithdrawalRulings(matches, [{ seat: "A1NS" }], []);
    expect(out[0].ruling).toBeNull();
  });

  it("ignores BYE rows (home-only, no opponent)", () => {
    const matches: TeamMatchStructureRow[] = [
      {
        section: "A",
        roundNumber: 2,
        kind: "BYE",
        home: "A1NS",
        opponent: null,
        groupId: null,
        vpPool: null,
        boardStart: 1,
        boardEnd: 2,
        ruling: null,
      },
    ];
    const out = applyTeamWithdrawalRulings(matches, [{ seat: "A1NS" }], []);
    expect(out[0].ruling).toBeNull();
  });

  it("treats the home team as offender when both teams withdrew", () => {
    const matches = [teamsMatch(2, "A1NS", "A2NS")];
    const out = applyTeamWithdrawalRulings(
      matches,
      [{ seat: "A1NS" }, { seat: "A2NS" }],
      [],
    );
    expect(out[0].ruling).toBe("VOID:SHORT_OFFENDER_NS");
  });

  it("does not mutate the input match rows", () => {
    const matches = [teamsMatch(2, "A1NS", "A2NS")];
    applyTeamWithdrawalRulings(matches, [{ seat: "A1NS" }], []);
    expect(matches[0].ruling).toBeNull();
  });
});
