import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SelectGame from "./SelectGame";

describe("SelectGame", () => {
  const mockGames = [
    { id: 1, eventName: "Game A" },
    { id: 2, eventName: "Game B" },
  ] as any;

  it("shows empty state when no games exist", () => {
    render(<SelectGame games={[]} onGameSelected={vi.fn()} />);

    expect(
      screen.getByText("No games yet. Waiting for director..."),
    ).toBeInTheDocument();
  });

  it("shows selection prompt when games exist", () => {
    render(<SelectGame games={mockGames} onGameSelected={vi.fn()} />);

    expect(
      screen.getByText("Please select the game you wish to join:"),
    ).toBeInTheDocument();
  });

  it("renders all game buttons", () => {
    render(<SelectGame games={mockGames} onGameSelected={vi.fn()} />);

    expect(screen.getByText("Game A")).toBeInTheDocument();
    expect(screen.getByText("Game B")).toBeInTheDocument();
  });

  it("calls onGameSelected when a game is clicked", () => {
    const fn = vi.fn();

    render(<SelectGame games={mockGames} onGameSelected={fn} />);

    fireEvent.click(screen.getByText("Game A"));

    expect(fn).toHaveBeenCalledWith(mockGames[0]);
  });

  it("calls onGameSelected for second game", () => {
    const fn = vi.fn();

    render(<SelectGame games={mockGames} onGameSelected={fn} />);

    fireEvent.click(screen.getByText("Game B"));

    expect(fn).toHaveBeenCalledWith(mockGames[1]);
  });

  it("renders correct number of buttons", () => {
    render(<SelectGame games={mockGames} onGameSelected={vi.fn()} />);

    const buttons = screen.getAllByRole("button");

    expect(buttons).toHaveLength(2);
  });

  it("applies button styling classes", () => {
    render(<SelectGame games={mockGames} onGameSelected={vi.fn()} />);

    const button = screen.getByText("Game A");

    expect(button).toHaveClass(
      "w-full",
      "py-3",
      "text-lg",
      "font-semibold",
      "bg-blue-300",
      "rounded-lg",
    );
  });
});
