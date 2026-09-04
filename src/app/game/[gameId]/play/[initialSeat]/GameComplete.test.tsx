import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { GameComplete } from "@/app/game/[gameId]/play/[initialSeat]/GameComplete";

const mockUseLeaderboard = vi.fn();

vi.mock("@/context/LeaderboardContext", () => ({
  LeaderboardProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="leaderboard-provider">{children}</div>
  ),
  useLeaderboardContext: () => mockUseLeaderboard(),
}));

vi.mock("@/context/AssignmentContext", () => ({
  useAssignment: () => ({ assignment: { type: "PAIR", id: "3" } }),
}));

vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    headerTitle,
    children,
  }: {
    headerTitle: string;
    children: React.ReactNode;
  }) => (
    <div>
      <div data-testid="header">{headerTitle}</div>
      {children}
    </div>
  ),
}));

vi.mock("@/components/leaderboard/Leaderboard", () => ({
  Leaderboard: ({
    highlightAssignmentId,
  }: {
    highlightAssignmentId?: string;
  }) => (
    <div data-testid="leaderboard">highlight:{highlightAssignmentId}</div>
  ),
}));

describe("GameComplete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a spinner while loading", () => {
    mockUseLeaderboard.mockReturnValue({ leaderboard: null, isLoading: true });
    const { container } = render(<GameComplete />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    expect(screen.queryByTestId("header")).not.toBeInTheDocument();
  });

  it("renders the leaderboard when one is available", () => {
    mockUseLeaderboard.mockReturnValue({
      leaderboard: { some: "data" },
      isLoading: false,
    });
    render(<GameComplete />);
    expect(screen.getByTestId("header")).toHaveTextContent("Game Complete");
    expect(screen.getByTestId("leaderboard")).toHaveTextContent("highlight:3");
  });

  it("renders a fallback message when there is no leaderboard", () => {
    mockUseLeaderboard.mockReturnValue({ leaderboard: null, isLoading: false });
    render(<GameComplete />);
    expect(
      screen.getByText("All rounds have been played. Thank you!"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("leaderboard")).not.toBeInTheDocument();
  });
});
