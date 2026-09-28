import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BoardResultsPage } from "@/app/game/[gameId]/play/[initialSeat]/BoardResultsPage";
import type { Card, Rank } from "@/model/common";

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
    lastBoardOfRound: false,
    scoredBoard: { pluginId: "MP", board: 5, lines: [] } as any,
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

  it("renders the headerRight slot content", () => {
    render(
      <BoardResultsPage
        {...baseProps}
        headerRight={<span data-testid="play-menu">menu</span>}
      />,
    );
    expect(screen.getByTestId("play-menu")).toBeInTheDocument();
  });

  const sampleDeal = () => {
    const ranks: Rank[] = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
    return {
      N: ranks.map((r): Card => `S${r}`),
      E: ranks.map((r): Card => `H${r}`),
      S: ranks.map((r): Card => `D${r}`),
      W: ranks.map((r): Card => `C${r}`),
    };
  };

  it("shows the results (traveller) by default, even when a deal exists", () => {
    render(<BoardResultsPage {...baseProps} deal={sampleDeal()} />);
    expect(screen.getByTestId("traveller")).toBeInTheDocument();
    expect(screen.queryByTestId("deal-display")).not.toBeInTheDocument();
  });

  it("shows the deal instead of the results when showDeal is set", () => {
    render(<BoardResultsPage {...baseProps} deal={sampleDeal()} showDeal />);
    expect(screen.getByTestId("deal-display")).toBeInTheDocument();
    expect(screen.queryByTestId("traveller")).not.toBeInTheDocument();
  });

  it("falls back to the results when showDeal is set but no deal exists", () => {
    render(<BoardResultsPage {...baseProps} deal={null} showDeal />);
    expect(screen.getByTestId("traveller")).toBeInTheDocument();
    expect(screen.queryByTestId("deal-display")).not.toBeInTheDocument();
  });
});
