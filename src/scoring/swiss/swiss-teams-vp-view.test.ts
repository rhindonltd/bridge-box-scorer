import { describe, it, expect } from "vitest";
import { buildSwissTeamsVpTable } from "./swiss-teams-vp-view";
import type { TeamSwissVpOverallScore } from "@/model/leaderboard";
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

function score(
  lines: TeamSwissVpOverallScore["lines"],
): TeamSwissVpOverallScore {
  return { type: "TEAM_SWISS_VP", mode: "TEAM", scoring: "SWISS_VP", lines };
}

describe("buildSwissTeamsVpTable", () => {
  it("builds Rank / Team / Total columns plus one per round", () => {
    const table = buildSwissTeamsVpTable(
      score([
        {
          rank: 1,
          tied: false,
          teamId: "A1",
          totalVP: 28,
          vpByRound: { 1: 13, 2: 15 },
        },
      ]),
      [team("A1", "The Aces")],
    );

    expect(table.columns.map((c) => c.label)).toEqual([
      "Rank",
      "Team",
      "Total",
      "1",
      "2",
    ]);
  });

  it("renders the team name as an expandable cell listing the four players", () => {
    const table = buildSwissTeamsVpTable(
      score([
        {
          rank: 2,
          tied: true,
          teamId: "A1",
          totalVP: 13,
          vpByRound: { 1: 13 },
        },
      ]),
      [team("A1", "The Aces")],
    );

    const row = table.rows[0];
    expect(row.highlightIds).toEqual(["A1"]);
    expect(row.cells[0]).toEqual({ kind: "text", value: "2=" });
    expect(row.cells[1]).toEqual({
      kind: "expandable",
      label: "The Aces",
      lines: ["Ada One", "Alan Two", "Grace One", "Edsger Two"],
    });
    expect(row.cells[2]).toEqual({ kind: "number", value: 13, decimals: 2 });
    expect(row.cells[3]).toEqual({ kind: "number", value: 13, decimals: 2 });
  });

  it("falls back to the raw team id (plain text) when the team is not found", () => {
    const table = buildSwissTeamsVpTable(
      score([
        { rank: 1, tied: false, teamId: "Z9", totalVP: 0, vpByRound: {} },
      ]),
      [],
    );

    expect(table.rows[0].cells[1]).toEqual({ kind: "text", value: "Z9" });
  });

  it("blanks a round the team has not been scored in", () => {
    const table = buildSwissTeamsVpTable(
      score([
        {
          rank: 1,
          tied: false,
          teamId: "A1",
          totalVP: 15,
          vpByRound: { 2: 15 },
        },
      ]),
      [team("A1", "The Aces")],
    );

    expect(table.rows[0].cells[3]).toEqual({ kind: "text", value: "" }); // round 1
    expect(table.rows[0].cells[4]).toEqual({
      kind: "number",
      value: 15,
      decimals: 2,
    }); // round 2
  });

  it("has no round columns before any round is scored", () => {
    const table = buildSwissTeamsVpTable(
      score([
        { rank: 1, tied: false, teamId: "A1", totalVP: 0, vpByRound: {} },
      ]),
      [team("A1", "The Aces")],
    );

    expect(table.columns.map((c) => c.label)).toEqual([
      "Rank",
      "Team",
      "Total",
    ]);
  });
});
