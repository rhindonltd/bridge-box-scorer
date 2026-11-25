import { describe, it, expect } from "vitest";
import { teamOverallViews } from "./team-views";
import type { AssignedTeam, Pair } from "@/model/participants";

function seatedPair(seat: string): Pair {
  return {
    type: "PAIR",
    initialSeat: seat as Pair["initialSeat"],
    player1: { id: 1, firstName: "A", lastName: "One", nationalId: null },
    player2: { id: 2, firstName: "B", lastName: "Two", nationalId: null },
  };
}
const teams: AssignedTeam[] = [
  {
    type: "TEAM",
    id: "A1",
    name: "Aces",
    pair1: seatedPair("A1NS"),
    pair2: seatedPair("A1EW"),
  },
];

describe("teamOverallViews", () => {
  it("resolves Swiss VP to a single VP view", () => {
    const views = teamOverallViews("TEAM_SWISS_VP");
    expect(views.map((v) => v.id)).toEqual(["vp"]);
    const table = views[0].toTable(
      {
        type: "TEAM_SWISS_VP",
        mode: "TEAM",
        scoring: "SWISS_VP",
        lines: [
          {
            rank: 1,
            tied: false,
            teamId: "A1",
            totalVP: 10,
            vpByRound: { 1: 10 },
          },
        ],
      },
      teams,
    );
    expect(table.rows).toHaveLength(1);
  });

  it("resolves aggregate IMP to a single IMP view", () => {
    const views = teamOverallViews("TEAM_IMP_AGG");
    expect(views.map((v) => v.id)).toEqual(["imps"]);
    const table = views[0].toTable(
      {
        type: "TEAM_IMP_AGG",
        mode: "TEAM",
        scoring: "IMP_AGG",
        barometer: true,
        lines: [
          {
            rank: 1,
            tied: false,
            teamId: "A1",
            totalImps: 3,
            impsByRound: { 1: 3 },
          },
        ],
      },
      teams,
    );
    expect(table.rows).toHaveLength(1);
  });

  it.each(["TEAM_BAM", "TEAM_PAB"] as const)(
    "%s offers percentage and points views",
    (type) => {
      const views = teamOverallViews(type) as any[];
      expect(views.map((v: any) => v.id)).toEqual(["percentage", "points"]);
      const score = {
        type,
        mode: "TEAM",
        scoring: type === "TEAM_BAM" ? "BAM" : "PAB",
        barometer: false,
        lines: [
          {
            rank: 1,
            tied: false,
            teamId: "A1",
            totalWon: 1,
            totalPlayed: 2,
            byRound: {},
          },
        ],
      };
      for (const view of views) {
        expect(view.toTable(score, teams).rows).toHaveLength(1);
      }
    },
  );
});
