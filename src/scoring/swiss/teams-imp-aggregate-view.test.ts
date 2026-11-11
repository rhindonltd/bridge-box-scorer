import { describe, it, expect } from "vitest";
import { buildTeamsImpAggregateTable } from "./teams-imp-aggregate-view";
import type { TeamImpAggOverallScore } from "@/model/leaderboard";
import type { AssignedTeam, Pair } from "@/model/participants";

function player(first: string, last: string) {
  return { id: 1, firstName: first, lastName: last, nationalId: null };
}
function seatedPair(seat: string, a: string, b: string): Pair {
  return {
    type: "PAIR",
    initialSeat: seat as Pair["initialSeat"],
    player1: player(a, "One"),
    player2: player(b, "Two"),
  };
}
function team(id: string, name: string): AssignedTeam {
  return {
    type: "TEAM",
    id,
    name,
    pair1: seatedPair(`${id}NS`, "Ada", "Alan"),
    pair2: seatedPair(`${id}EW`, "Grace", "Edsger"),
  };
}

describe("buildTeamsImpAggregateTable", () => {
  const teams = [team("A1", "Aces"), team("A2", "Kings")];
  const score: TeamImpAggOverallScore = {
    type: "TEAM_IMP_AGG",
    mode: "TEAM",
    scoring: "IMP_AGG",
    barometer: true,
    lines: [
      { rank: 1, tied: false, teamId: "A1", totalImps: 5, impsByRound: { 1: 5, 2: 0 } },
      { rank: 2, tied: false, teamId: "A2", totalImps: -5, impsByRound: { 2: -5 } },
    ],
  };

  it("has Rank/Team/Total plus one column per round", () => {
    const table = buildTeamsImpAggregateTable(score, teams);
    expect(table.columns.map((c) => c.label)).toEqual([
      "Rank",
      "Team",
      "Total",
      "1",
      "2",
    ]);
    expect(table.rows).toHaveLength(2);
    expect(table.rows[0].highlightIds).toEqual(["A1"]);
  });

  it("renders a missing round as an empty cell and a zero as a number", () => {
    const table = buildTeamsImpAggregateTable(score, teams);
    // A1 round 2 = 0 (a number); A2 round 1 is missing (empty text).
    expect(table.rows[0].cells[4]).toMatchObject({ value: 0 });
    expect(table.rows[1].cells[3]).toMatchObject({ kind: "text", value: "" });
    expect(table.rows[1].cells[4]).toMatchObject({ value: -5 });
  });
});
