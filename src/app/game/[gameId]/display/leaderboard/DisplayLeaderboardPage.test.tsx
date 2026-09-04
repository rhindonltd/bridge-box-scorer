import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({ game: { gameId: "g1" }, mutateGame: vi.fn() }),
}));

// Capture what leaderboard the display renders without exercising the scoring
// plugins.
const leaderboardSpy = vi.fn();
vi.mock("@/components/leaderboard/Leaderboard", () => ({
  Leaderboard: (props: { overallScoreAndParticipant: { type: string } }) => {
    leaderboardSpy(props.overallScoreAndParticipant);
    return (
      <div data-testid="leaderboard">
        {props.overallScoreAndParticipant.type}
      </div>
    );
  },
}));

// The display consumes the leaderboard context; the provider is a passthrough
// and the hook returns the mocked snapshot.
const mockContext = vi.fn();
vi.mock("@/context/LeaderboardContext", () => ({
  LeaderboardProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  useLeaderboardContext: () => mockContext(),
}));

import { DisplayLeaderboardPage } from "./DisplayLeaderboardPage";

function combined() {
  return { type: "PAIR_MP", overallScore: { scoring: "MP" }, participants: [] };
}
function sectionLb(section: string) {
  return {
    section,
    type: `PAIR_MP_${section}`,
    overallScore: { scoring: "MP" },
    participants: [],
  };
}

describe("DisplayLeaderboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows only the combined leaderboard when there is a single section", () => {
    mockContext.mockReturnValue({
      leaderboard: combined(),
      sections: [sectionLb("A")],
      isLoading: false,
    });

    render(<DisplayLeaderboardPage />);

    // No toggle tabs for a single section.
    expect(screen.queryByText("Combined")).not.toBeInTheDocument();
    expect(leaderboardSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "PAIR_MP" }),
    );
  });

  it("offers combined + per-section tabs when multiple sections exist", () => {
    mockContext.mockReturnValue({
      leaderboard: combined(),
      sections: [sectionLb("A"), sectionLb("B")],
      isLoading: false,
    });

    render(<DisplayLeaderboardPage />);

    expect(screen.getByText("Combined")).toBeInTheDocument();
    expect(screen.getByText("Section A")).toBeInTheDocument();
    expect(screen.getByText("Section B")).toBeInTheDocument();
    // Defaults to combined.
    expect(leaderboardSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "PAIR_MP" }),
    );
  });

  it("switches to a section's leaderboard when its tab is clicked", () => {
    mockContext.mockReturnValue({
      leaderboard: combined(),
      sections: [sectionLb("A"), sectionLb("B")],
      isLoading: false,
    });

    render(<DisplayLeaderboardPage />);

    fireEvent.click(screen.getByText("Section B"));

    expect(leaderboardSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "PAIR_MP_B", section: "B" }),
    );
  });

  it("shows an empty state when there is no leaderboard yet", () => {
    mockContext.mockReturnValue({
      leaderboard: null,
      sections: [],
      isLoading: false,
    });

    render(<DisplayLeaderboardPage />);

    expect(screen.getByText("No Results Yet")).toBeInTheDocument();
  });
});
