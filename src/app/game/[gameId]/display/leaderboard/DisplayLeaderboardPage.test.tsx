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

    // Switch back to the Combined tab.
    fireEvent.click(screen.getByText("Combined"));
    expect(leaderboardSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "PAIR_MP" }),
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

  it("shows a spinner while the leaderboard is loading", () => {
    mockContext.mockReturnValue({
      leaderboard: null,
      sections: [],
      isLoading: true,
    });

    const { container } = render(<DisplayLeaderboardPage />);
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("falls back to the combined leaderboard when the selected section is missing", () => {
    // Three "sections" so the tab bar shows, but their `section` values differ
    // from what we select, forcing the `?? combined` fallback path.
    mockContext.mockReturnValue({
      leaderboard: combined(),
      sections: [sectionLb("A"), sectionLb("B")],
      isLoading: false,
    });

    const { rerender } = render(<DisplayLeaderboardPage />);

    // Click Section B, then simulate that section disappearing from the
    // snapshot (e.g. a re-scored update) so `find` returns undefined and the
    // component falls back to the combined leaderboard.
    fireEvent.click(screen.getByText("Section B"));
    expect(leaderboardSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "PAIR_MP_B" }),
    );

    mockContext.mockReturnValue({
      leaderboard: combined(),
      // B removed, but keep >1 section so the view stays "B".
      sections: [sectionLb("A"), sectionLb("C")],
      isLoading: false,
    });
    rerender(<DisplayLeaderboardPage />);

    // View is still "B" but no matching section -> combined fallback.
    expect(leaderboardSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: "PAIR_MP" }),
    );
  });
});
