import { describe, it, expect } from "vitest";
import { buildTeamsBoardComparisonTable } from "./teams-board-comparison-view";
import type {
  TeamBamOverallScore,
  TeamPabOverallScore,
} from "@/model/leaderboard";
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
  lines: TeamBamOverallScore["lines"],
  barometer: boolean,
): TeamBamOverallScore {
  return { type: "TEAM_BAM", mode: "TEAM", scoring: "BAM", barometer, lines };
}

describe("buildTeamsBoardComparisonTable", () => {
  const teams = [team("A1", "Aces"), team("A2", "Kings")];

  it("barometer layout has a per-round column and won/played fraction cells", () => {
    const table = buildTeamsBoardComparisonTable(
      score(
        [
          {
            rank: 1,
            tied: false,
            teamId: "A1",
            totalWon: 1.5,
            totalPlayed: 3,
            byRound: { 1: { won: 1.5, played: 3 } },
          },
        ],
        true,
      ),
      teams,
      "fraction",
    );

    expect(table.columns.map((c) => c.label)).toEqual([
      "Rank",
      "Team",
      "Total",
      "1",
    ]);
    // Total cell and the round-1 cell both show "1.5/3".
    expect(table.rows[0].cells[2]).toEqual({ kind: "text", value: "1.5/3" });
    expect(table.rows[0].cells[3]).toEqual({ kind: "text", value: "1.5/3" });
    expect(table.rows[0].highlightIds).toEqual(["A1"]);
  });

  it("percentage view renders boards-won as a 2-decimal percentage", () => {
    const table = buildTeamsBoardComparisonTable(
      score(
        [
          {
            rank: 1,
            tied: false,
            teamId: "A1",
            totalWon: 1.5,
            totalPlayed: 3,
            byRound: { 1: { won: 1.5, played: 3 } },
          },
        ],
        true,
      ),
      teams,
      "percentage",
    );

    // 1.5 / 3 * 100 = 50.
    expect(table.rows[0].cells[2]).toEqual({
      kind: "number",
      value: 50,
      decimals: 2,
    });
  });

  it("whole-number wins render without a decimal in the fraction view", () => {
    const table = buildTeamsBoardComparisonTable(
      score(
        [
          {
            rank: 1,
            tied: false,
            teamId: "A1",
            totalWon: 2,
            totalPlayed: 3,
            byRound: { 1: { won: 2, played: 3 } },
          },
        ],
        true,
      ),
      teams,
      "fraction",
    );

    expect(table.rows[0].cells[2]).toEqual({ kind: "text", value: "2/3" });
  });

  it("non-barometer layout has no per-round columns, only a cumulative total", () => {
    const table = buildTeamsBoardComparisonTable(
      score(
        [
          {
            rank: 1,
            tied: false,
            teamId: "A1",
            totalWon: 7,
            totalPlayed: 12,
            byRound: { 1: { won: 4, played: 6 }, 2: { won: 3, played: 6 } },
          },
        ],
        false,
      ),
      teams,
      "fraction",
    );

    expect(table.columns.map((c) => c.label)).toEqual([
      "Rank",
      "Team",
      "Total",
    ]);
    expect(table.rows[0].cells[2]).toEqual({ kind: "text", value: "7/12" });
  });

  it("renders the team name as an expandable cell of the four players", () => {
    const table = buildTeamsBoardComparisonTable(
      score(
        [
          {
            rank: 1,
            tied: false,
            teamId: "A1",
            totalWon: 0,
            totalPlayed: 0,
            byRound: {},
          },
        ],
        false,
      ),
      teams,
      "fraction",
    );

    expect(table.rows[0].cells[1]).toEqual({
      kind: "expandable",
      label: "Aces",
      lines: ["Ada One", "Alan Two", "Grace One", "Edsger Two"],
    });
  });

  it("falls back to the raw team id when the team is not found", () => {
    const table = buildTeamsBoardComparisonTable(
      score(
        [
          {
            rank: 1,
            tied: false,
            teamId: "Z9",
            totalWon: 0,
            totalPlayed: 0,
            byRound: {},
          },
        ],
        false,
      ),
      teams,
      "fraction",
    );

    expect(table.rows[0].cells[1]).toEqual({ kind: "text", value: "Z9" });
  });

  it("blanks a round the team has not been scored in (barometer)", () => {
    const table = buildTeamsBoardComparisonTable(
      score(
        [
          {
            rank: 1,
            tied: false,
            teamId: "A1",
            totalWon: 2,
            totalPlayed: 3,
            byRound: { 2: { won: 2, played: 3 } },
          },
        ],
        true,
      ),
      teams,
      "fraction",
    );

    // Round columns 1 and 2 exist; round 1 is blank for this team.
    expect(table.columns.map((c) => c.label)).toEqual([
      "Rank",
      "Team",
      "Total",
      "1",
      "2",
    ]);
    expect(table.rows[0].cells[3]).toEqual({ kind: "text", value: "" });
    expect(table.rows[0].cells[4]).toEqual({ kind: "text", value: "2/3" });
  });
});

describe("buildTeamsBoardComparisonTable — Point-a-Board scale", () => {
  const teams = [team("A1", "Aces"), team("A2", "Kings")];

  function pabScore(
    lines: TeamPabOverallScore["lines"],
    barometer: boolean,
  ): TeamPabOverallScore {
    return { type: "TEAM_PAB", mode: "TEAM", scoring: "PAB", barometer, lines };
  }

  it("doubles board units into points in the fraction view (2 points per board)", () => {
    const table = buildTeamsBoardComparisonTable(
      pabScore(
        [
          {
            rank: 1,
            tied: false,
            teamId: "A1",
            totalWon: 1.5,
            totalPlayed: 3,
            byRound: { 1: { won: 1.5, played: 3 } },
          },
        ],
        true,
      ),
      teams,
      "fraction",
    );

    // 1.5 boards of 3 -> 3 points of 6. Total and round-1 cells both "3/6".
    expect(table.rows[0].cells[2]).toEqual({ kind: "text", value: "3/6" });
    expect(table.rows[0].cells[3]).toEqual({ kind: "text", value: "3/6" });
  });

  it("shows a half point when boards won is odd on the PAB scale", () => {
    // 1.25 boards -> 2.5 points; 2 boards played -> 4 points available.
    const table = buildTeamsBoardComparisonTable(
      pabScore(
        [
          {
            rank: 1,
            tied: false,
            teamId: "A1",
            totalWon: 1.25,
            totalPlayed: 2,
            byRound: { 1: { won: 1.25, played: 2 } },
          },
        ],
        false,
      ),
      teams,
      "fraction",
    );

    expect(table.rows[0].cells[2]).toEqual({ kind: "text", value: "2.5/4" });
  });

  it("gives the same percentage as BAM for the same board result", () => {
    const table = buildTeamsBoardComparisonTable(
      pabScore(
        [
          {
            rank: 1,
            tied: false,
            teamId: "A1",
            totalWon: 1.5,
            totalPlayed: 3,
            byRound: { 1: { won: 1.5, played: 3 } },
          },
        ],
        true,
      ),
      teams,
      "percentage",
    );

    // 3/6 = 50% — identical to BAM's 1.5/3.
    expect(table.rows[0].cells[2]).toEqual({
      kind: "number",
      value: 50,
      decimals: 2,
    });
  });
});
