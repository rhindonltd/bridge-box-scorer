import { render, screen } from "@testing-library/react";
import PlayerCard from "./PlayerCard";
import { describe, it, expect } from "vitest";

describe("PlayerCard", () => {
  it("renders label correctly", () => {
    render(<PlayerCard label="North" player={null} />);
    expect(screen.getByText("North")).toBeInTheDocument();
  });

  it("renders 'Empty' when player is null", () => {
    render(<PlayerCard label="South" player={null} />);
    expect(screen.getByText("Empty")).toBeInTheDocument();
  });

  it("renders player name when player is provided", () => {
    render(
      <PlayerCard
        label="East"
        player={{ firstName: "Alice", lastName: "Smith", nationalId: null }}
      />,
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Smith")).toBeInTheDocument();
  });

  it("applies inactive styles when no player", () => {
    render(<PlayerCard label="West" player={null} />);
    const container = screen.getByText("Empty").parentElement;
    expect(container).toHaveClass("bg-gray-100");
    expect(container).toHaveClass("text-gray-500");
  });

  it("applies active styles when player exists", () => {
    render(
      <PlayerCard
        label="North"
        player={{ firstName: "John", lastName: "Doe", nationalId: "123" }}
      />,
    );
    const container = screen.getByText("John").parentElement;
    expect(container).toHaveClass("bg-white");
    expect(container).toHaveClass("text-gray-900");
  });

  it("renders full structure correctly", () => {
    render(
      <PlayerCard
        label="Test"
        player={{ firstName: "A", lastName: "B", nationalId: null }}
      />,
    );
    expect(screen.getByText("Test")).toHaveClass("text-sm");
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });
});
