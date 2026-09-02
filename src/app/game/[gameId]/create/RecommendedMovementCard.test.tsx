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
  pros: ["Every pair plays every other pair", "Full 25 or shorter 20 boards"],
  cons: ["One stationary pair only"],
  note: "Shuffle the last-round boards in advance.",
  source: "db",
  specRef: { source: "db", id: 7, type: "2" },
};

describe("RecommendedMovementCard", () => {
  it("renders the movement name and boards-a-pair-plays stat", () => {
    render(<RecommendedMovementCard movement={movement} onSelect={vi.fn()} />);

    expect(screen.getByText("3 Table Howell")).toBeInTheDocument();
    expect(screen.getByText("Boards a Pair Plays")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
  });

  it("renders pros and cons", () => {
    render(<RecommendedMovementCard movement={movement} onSelect={vi.fn()} />);

    expect(screen.getByText("Pros")).toBeInTheDocument();
    expect(screen.getByText("Cons")).toBeInTheDocument();
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

  it("calls onSelect when clicked", () => {
    const onSelect = vi.fn();
    render(
      <RecommendedMovementCard movement={movement} onSelect={onSelect} />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledOnce();
  });
});
