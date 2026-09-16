import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

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

function team(id: string, name = "Sharks"): AssignedTeam {
  return {
    type: "TEAM",
    id,
    name,
    pair1: pair("Alice", "Bob"),
    pair2: pair("Carol", "Dan"),
  } as AssignedTeam;
}

describe("TeamOverallLeaderboard", () => {
  it("renders ranked team rows showing the team name (not the players) by default", () => {
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
        teams={[team("T1", "Sharks"), team("T2", "Dragons")]}
        leaderboard={leaderboard}
      />,
    );

    // Header + score values present.
    expect(screen.getByText("Team")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    // Tied rank rendered with "=".
    expect(screen.getByText("2=")).toBeInTheDocument();
    // Team names shown; players hidden until expanded.
    expect(screen.getByText("Sharks")).toBeInTheDocument();
    expect(screen.getByText("Dragons")).toBeInTheDocument();
    expect(screen.queryByText("Alice X")).not.toBeInTheDocument();
  });

  it("reveals the four player names when the team name is clicked", () => {
    const leaderboard: TeamOverallOverallScore = {
      type: "TEAM_OVERALL",
      mode: "TEAM",
      scoring: "OVERALL",
      lines: [{ teamId: "T1", rank: 1, tied: false, score: 42 }],
    } as TeamOverallOverallScore;

    render(
      <TeamOverallLeaderboard
        teams={[team("T1", "Sharks")]}
        leaderboard={leaderboard}
      />,
    );

    const toggle = screen.getByRole("button", { name: "Sharks" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Alice X")).toBeInTheDocument();
    expect(screen.getByText("Bob Y")).toBeInTheDocument();
    expect(screen.getByText("Carol X")).toBeInTheDocument();
    expect(screen.getByText("Dan Y")).toBeInTheDocument();
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
