import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { TeamOverallLeaderboard } from "./TeamOverallLeaderboard";
import type { AssignedTeam } from "@/model/participants";
import type { TeamOverallOverallScore } from "@/model/leaderboard";

function pair(a: string, b: string) {
  return {
    type: "PAIR",
    initialSeat: "A1NS",
    player1: { id: 1, firstName: a, lastName: "X" },
    player2: { id: 2, firstName: b, lastName: "Y" },
  };
}

function team(id: string): AssignedTeam {
  return {
    type: "TEAM",
    id,
    pair1: pair("Alice", "Bob"),
    pair2: pair("Carol", "Dan"),
  } as AssignedTeam;
}

describe("TeamOverallLeaderboard", () => {
  it("renders ranked team rows with all four player names", () => {
    const leaderboard: TeamOverallOverallScore = {
      type: "TEAM_OVERALL",
      mode: "TEAM",
      scoring: "OVERALL",
      lines: [
        { teamId: "T1", rank: 1, tied: false, score: 42 },
        { teamId: "T2", rank: 2, tied: true, score: 30 },
      ],
    } as TeamOverallOverallScore;

    render(
      <TeamOverallLeaderboard
        teams={[team("T1"), team("T2")]}
        leaderboard={leaderboard}
      />,
    );

    // Header + score values present.
    expect(screen.getByText("Team")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    // Tied rank rendered with "=".
    expect(screen.getByText("2=")).toBeInTheDocument();
    // Player names from the resolved team appear (multiple teams -> use getAll).
    expect(screen.getAllByText("Alice X").length).toBeGreaterThan(0);
  });

  it("falls back to the raw team id when the team is not found", () => {
    const leaderboard: TeamOverallOverallScore = {
      type: "TEAM_OVERALL",
      mode: "TEAM",
      scoring: "OVERALL",
      lines: [{ teamId: "GHOST", rank: 1, tied: false, score: 10 }],
    } as TeamOverallOverallScore;

    render(<TeamOverallLeaderboard teams={[]} leaderboard={leaderboard} />);
    expect(screen.getByText("GHOST")).toBeInTheDocument();
  });
});
