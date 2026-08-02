import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BoardResultsPage } from "./BoardResultsPage";

vi.mock("@/context/GameContext", () => ({
  useGame: () => ({
    game: {
      eventName: "Monday Pairs",
      gameId: "g1",
      gameType: "PAIRS",
      tables: 4,
    },
  }),
}));

vi.mock("@/context/AssignmentContext", () => ({
  useAssignment: () => ({
    assignment: { type: "PAIR", id: "3" },
  }),
}));

vi.mock("@/components/results/traveller/Traveller", () => ({
  Traveller: ({ scoredTraveller }: any) => (
    <div data-testid="traveller">Traveller {scoredTraveller?.id ?? "none"}</div>
  ),
}));

describe("BoardResultsPage", () => {
  const baseProps = {
    board: 5,
    lastBoardOfRound: false,
    scoredTraveller: { id: 123 } as any,
    onNext: vi.fn(),
  };

  it("renders header with event name and pair info", () => {
    render(<BoardResultsPage {...baseProps} />);
    expect(screen.getByText("Monday Pairs")).toBeInTheDocument();
    expect(screen.getByText("Pair 3")).toBeInTheDocument();
  });

  it("renders board info in header detail", () => {
    render(<BoardResultsPage {...baseProps} />);
    expect(screen.getByText("Board 5")).toBeInTheDocument();
  });

  it("renders Traveller component", () => {
    render(<BoardResultsPage {...baseProps} />);
    expect(screen.getByTestId("traveller")).toBeInTheDocument();
  });

  it("renders Next Board button when not last board", () => {
    render(<BoardResultsPage {...baseProps} lastBoardOfRound={false} />);
    expect(
      screen.getByRole("button", { name: "Next Board" }),
    ).toBeInTheDocument();
  });

  it("renders Next Round button when last board", () => {
    render(<BoardResultsPage {...baseProps} lastBoardOfRound={true} />);
    expect(
      screen.getByRole("button", { name: "Next Round" }),
    ).toBeInTheDocument();
  });

  it("calls onNext when button clicked", () => {
    const fn = vi.fn();
    render(<BoardResultsPage {...baseProps} onNext={fn} />);
    fireEvent.click(screen.getByRole("button"));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("applies layout classes", () => {
    const { container } = render(<BoardResultsPage {...baseProps} />);
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass("flex-1", "flex", "flex-col");
  });

  it("keeps traveller in flexible scroll area", () => {
    render(<BoardResultsPage {...baseProps} />);
    const travellerWrapper = screen.getByTestId("traveller").parentElement;
    expect(travellerWrapper).toHaveClass("flex-1", "min-h-0");
  });
});
