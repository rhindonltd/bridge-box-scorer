import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BoardResultsPage } from "@/app/game/[gameId]/play/[initialSeat]/BoardResultsPage";

vi.mock("@/context/GameContext", () => {
  const game = {
    eventName: "Monday Pairs",
    gameId: "g1",
    gameType: "PAIRS",
    tables: 4,
  };
  return {
    useGame: () => ({ game, isLoading: false, mutateGame: vi.fn() }),
    useRequiredGame: () => ({ game, mutateGame: vi.fn() }),
  };
});

vi.mock("@/context/AssignmentContext", () => ({
  useAssignment: () => ({
    assignment: { type: "PAIR", id: "3" },
  }),
}));

vi.mock("@/components/traveller/Traveller", () => ({
  Traveller: ({ scoredBoard }: any) => (
    <div data-testid="traveller">
      Traveller {scoredBoard?.pluginId ?? "none"}
    </div>
  ),
}));

describe("BoardResultsPage", () => {
  const baseProps = {
    board: 5,
    playedBoards: [5],
    lastBoardOfRound: false,
    scoredBoard: { pluginId: "MP", board: 5, lines: [] } as any,
    onBoardSelected: vi.fn(),
    onNext: vi.fn(),
  };

  it("renders the Board Results header", () => {
    render(<BoardResultsPage {...baseProps} />);
    expect(screen.getByText("Board Results")).toBeInTheDocument();
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

  it("calls onNext when the action button is clicked", () => {
    const fn = vi.fn();
    render(<BoardResultsPage {...baseProps} onNext={fn} />);
    fireEvent.click(screen.getByRole("button", { name: "Next Board" }));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("applies layout classes", () => {
    const { container } = render(<BoardResultsPage {...baseProps} />);
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass("flex-1", "flex", "flex-col");
  });
});
