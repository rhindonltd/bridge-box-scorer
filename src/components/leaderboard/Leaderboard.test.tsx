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
});
