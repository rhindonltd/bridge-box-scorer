import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

import { TeamMatchLeaderboard } from "./TeamMatchLeaderboard";
import type { TeamMatchOverallScore } from "@/model/leaderboard";

describe("TeamMatchLeaderboard", () => {
  it("renders nothing (placeholder implementation)", () => {
    const leaderboard = {
      type: "TEAM_MATCH",
      mode: "TEAM",
      scoring: "MATCH",
    } as unknown as TeamMatchOverallScore;

    const { container } = render(
      <TeamMatchLeaderboard teams={[]} leaderboard={leaderboard} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
