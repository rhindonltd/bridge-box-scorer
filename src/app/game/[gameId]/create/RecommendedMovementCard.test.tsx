import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RecommendedMovementCard } from "@/app/game/[gameId]/create/RecommendedMovementCard";
import { RecommendedMovement } from "@/movement/recommendations/recommendation-types";

const movement: RecommendedMovement = {
  family: "HOWELL",
  name: "3 Table Howell",
  rounds: 5,
  boardsPerRound: 5,
  boardsPerPair: 25,
  boardsInPlay: 25,
  copies: 1,
  pros: ["Every pair plays every other pair", "Full 25 or shorter 20 boards"],
  cons: ["One stationary pair only"],
  note: "Shuffle the last-round boards in advance.",
  source: "db",
  specRef: { source: "db", id: 7, type: "2" },
};

describe("RecommendedMovementCard", () => {
  it("renders the movement name", () => {
    render(<RecommendedMovementCard movement={movement} onSelect={vi.fn()} />);

    expect(screen.getByText("3 Table Howell")).toBeInTheDocument();
  });

  it("does not render the boards-a-pair-plays stat (used for grouping instead)", () => {
    render(<RecommendedMovementCard movement={movement} onSelect={vi.fn()} />);

    expect(screen.queryByText("Boards a Pair Plays")).not.toBeInTheDocument();
  });

  it("shows the number of boards in play as a stat", () => {
    render(<RecommendedMovementCard movement={movement} onSelect={vi.fn()} />);

    expect(screen.getByText("Boards per Set")).toBeInTheDocument();
    // boardsInPlay (25) is shown; boardsPerPair is not a card stat.
    expect(screen.getByText("25")).toBeInTheDocument();
  });

  it("renders the boards-per-set stat and no Copies stat", () => {
    render(<RecommendedMovementCard movement={movement} onSelect={vi.fn()} />);

    expect(screen.getByText("Boards / Round")).toBeInTheDocument();
    expect(screen.queryByText("Copies")).not.toBeInTheDocument();
  });

  it("notes the required board-set copies only when more than one is needed", () => {
    // Single-copy movement: no copies note.
    const { rerender } = render(
      <RecommendedMovementCard movement={movement} onSelect={vi.fn()} />,
    );
    expect(screen.queryByText(/sets of boards/i)).not.toBeInTheDocument();

    // Multi-copy (e.g. Web Mitchell): note explains the duplicate sets.
    const web: RecommendedMovement = {
      ...movement,
      family: "WEB",
      name: "Web Mitchell",
      copies: 2,
    };
    rerender(<RecommendedMovementCard movement={web} onSelect={vi.fn()} />);
    expect(
      screen.getByText("Needs 2 sets of boards."),
    ).toBeInTheDocument();
  });

  it("renders pros and cons", () => {
    render(<RecommendedMovementCard movement={movement} onSelect={vi.fn()} />);

    expect(
      screen.getByText("Every pair plays every other pair"),
    ).toBeInTheDocument();
    expect(screen.getByText("One stationary pair only")).toBeInTheDocument();
  });

  it("renders the optional note when present", () => {
    render(<RecommendedMovementCard movement={movement} onSelect={vi.fn()} />);
    expect(
      screen.getByText("Shuffle the last-round boards in advance."),
    ).toBeInTheDocument();
  });

  it("omits the pros/cons block entirely when both are empty and hides an absent note", () => {
    const bare: RecommendedMovement = {
      ...movement,
      pros: [],
      cons: [],
      note: undefined,
      copies: 1,
    };
    render(<RecommendedMovementCard movement={bare} onSelect={vi.fn()} />);

    expect(
      screen.queryByText("Every pair plays every other pair"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("One stationary pair only")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Shuffle the last-round boards in advance."),
    ).not.toBeInTheDocument();
  });

  it("renders the pros list but skips an empty cons list", () => {
    const prosOnly: RecommendedMovement = {
      ...movement,
      pros: ["A single upside"],
      cons: [],
    };
    render(<RecommendedMovementCard movement={prosOnly} onSelect={vi.fn()} />);

    expect(screen.getByText("A single upside")).toBeInTheDocument();
    expect(screen.queryByText("One stationary pair only")).not.toBeInTheDocument();
  });

  it("calls onSelect when clicked", () => {
    const onSelect = vi.fn();
    render(
      <RecommendedMovementCard movement={movement} onSelect={onSelect} />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledOnce();
  });
});
