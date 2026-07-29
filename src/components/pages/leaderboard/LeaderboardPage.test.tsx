import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LeaderboardPage } from "./LeaderboardPage";

vi.mock("@/components/common/GameInfo", () => ({
  GameInfo: () => <div data-testid="game-info" />,
}));

vi.mock("@/components/results/leaderboard/Leaderboard", () => ({
  Leaderboard: ({ overallScoreAndParticipant }: any) => (
    <div data-testid="leaderboard">
      Participants: {overallScoreAndParticipant?.length ?? 0}
    </div>
  ),
}));

describe("LeaderboardPage", () => {
  const baseProps = {
    overallScoreAndParticipant: [{ score: 10 }, { score: 20 }] as any,
    onNext: vi.fn(),
  };

  it("renders GameInfo", () => {
    render(<LeaderboardPage {...baseProps} />);
    expect(screen.getByTestId("game-info")).toBeInTheDocument();
  });

  it("renders Results header", () => {
    render(<LeaderboardPage {...baseProps} />);
    expect(screen.getByText("Results")).toBeInTheDocument();
  });

  it("renders Leaderboard component", () => {
    render(<LeaderboardPage {...baseProps} />);
    expect(screen.getByTestId("leaderboard")).toBeInTheDocument();
  });

  it("passes data to Leaderboard", () => {
    render(<LeaderboardPage {...baseProps} />);
    expect(screen.getByText("Participants: 2")).toBeInTheDocument();
  });

  it("renders Close button", () => {
    render(<LeaderboardPage {...baseProps} />);
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("calls onNext when Close button is clicked", () => {
    const fn = vi.fn();
    render(<LeaderboardPage {...baseProps} onNext={fn} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("applies layout classes", () => {
    const { container } = render(<LeaderboardPage {...baseProps} />);
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass("h-screen", "flex", "flex-col", "bg-gray-100");
  });

  it("keeps leaderboard in flexible container", () => {
    render(<LeaderboardPage {...baseProps} />);
    const leaderboardWrapper = screen.getByTestId("leaderboard").parentElement;
    expect(leaderboardWrapper).toHaveClass("flex-1", "min-h-0");
  });
});
