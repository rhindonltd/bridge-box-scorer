import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { Leaderboard } from "./Leaderboard";
import type {
  OverallScoreAndParticipant,
  PairMatchpointOverallScore,
} from "@/model/leaderboard";
import type { AssignedPair } from "@/model/participants";

function pair(id: string, names: [string, string, string, string]): AssignedPair {
  return {
    type: "PAIR",
    id,
    initialSeat: `${id}` as AssignedPair["initialSeat"],
    player1: { id: 1, firstName: names[0], lastName: names[1] },
    player2: { id: 2, firstName: names[2], lastName: names[3] },
  } as AssignedPair;
}

describe("Leaderboard (PAIR MP)", () => {
  it("renders ranked pair rows via the MP overall plugin", () => {
    const overallScore: PairMatchpointOverallScore = {
      type: "PAIR_MP",
      mode: "PAIR",
      scoring: "MP",
      lines: [
        { pairId: "A1", rank: 1, tied: false, totalMP: 30, maxMP: 40 },
        { pairId: "A2", rank: 2, tied: false, totalMP: 20, maxMP: 40 },
      ],
    };

    const data: OverallScoreAndParticipant = {
      type: "PAIR_MP",
      overallScore,
      participants: [
        pair("A1", ["Alice", "Adams", "Bob", "Brown"]),
        pair("A2", ["Carol", "Clark", "Dan", "Day"]),
      ],
    } as OverallScoreAndParticipant;

    render(<Leaderboard overallScoreAndParticipant={data} />);

    expect(screen.getByText("Alice Adams")).toBeInTheDocument();
    expect(screen.getByText("Carol Clark")).toBeInTheDocument();
    // The default MP view is the percentage view; both pairs appear as rows.
    expect(screen.getByText("Bob Brown")).toBeInTheDocument();
  });

  it("renders the team-match variant (currently a placeholder)", () => {
    const data = {
      type: "TEAM_MATCH",
      overallScore: { type: "TEAM_MATCH", mode: "TEAM", scoring: "MATCH" },
      participants: [],
    } as unknown as OverallScoreAndParticipant;

    const { container } = render(
      <Leaderboard overallScoreAndParticipant={data} />,
    );
    // TeamMatchLeaderboard renders nothing yet.
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the team-overall variant", () => {
    const team = {
      type: "TEAM",
      id: "T1",
      pair1: {
        type: "PAIR",
        initialSeat: "A1NS",
        player1: { id: 1, firstName: "Alice", lastName: "X" },
        player2: { id: 2, firstName: "Bob", lastName: "Y" },
      },
      pair2: {
        type: "PAIR",
        initialSeat: "A1EW",
        player1: { id: 3, firstName: "Carol", lastName: "Z" },
        player2: { id: 4, firstName: "Dan", lastName: "W" },
      },
    };

    const data = {
      type: "TEAM_OVERALL",
      overallScore: {
        type: "TEAM_OVERALL",
        mode: "TEAM",
        scoring: "OVERALL",
        lines: [{ teamId: "T1", rank: 1, tied: false, score: 42 }],
      },
      participants: [team],
    } as unknown as OverallScoreAndParticipant;

    render(<Leaderboard overallScoreAndParticipant={data} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });
});
