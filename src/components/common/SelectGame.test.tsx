import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SelectGame } from "./SelectGame";

describe("SelectGame", () => {
  const mockGames = [
    { gameId: "id-a", eventName: "Game A" },
    { gameId: "id-b", eventName: "Game B" },
  ] as any;

  it("shows empty state when no games exist", () => {
    render(<SelectGame headerTitle="Title" games={[]} onGameSelected={vi.fn()} />);
    expect(
      screen.getByText("No games yet. Waiting for director..."),
    ).toBeInTheDocument();
  });

  it("shows selection prompt when games exist", () => {
    render(<SelectGame headerTitle="Title" games={mockGames} onGameSelected={vi.fn()} />);
    expect(
      screen.getByText("Please select the game you wish to join:"),
    ).toBeInTheDocument();
  });

  it("renders all game buttons", () => {
    render(<SelectGame headerTitle="Title" games={mockGames} onGameSelected={vi.fn()} />);
    expect(screen.getByText("Game A")).toBeInTheDocument();
    expect(screen.getByText("Game B")).toBeInTheDocument();
  });

  it("calls onGameSelected with gameId when a game is clicked", () => {
    const fn = vi.fn();
    render(<SelectGame headerTitle="Title" games={mockGames} onGameSelected={fn} />);
    fireEvent.click(screen.getByText("Game A"));
    expect(fn).toHaveBeenCalledWith("id-a");
  });

  it("calls onGameSelected for second game", () => {
    const fn = vi.fn();
    render(<SelectGame headerTitle="Title" games={mockGames} onGameSelected={fn} />);
    fireEvent.click(screen.getByText("Game B"));
    expect(fn).toHaveBeenCalledWith("id-b");
  });

  it("renders correct number of buttons", () => {
    render(<SelectGame headerTitle="Title" games={mockGames} onGameSelected={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
  });

  it("applies button styling classes", () => {
    render(<SelectGame headerTitle="Title" games={mockGames} onGameSelected={vi.fn()} />);
    const button = screen.getByText("Game A");
    expect(button).toHaveClass(
      "w-full",
      "py-3",
      "text-lg",
      "font-semibold",
      "bg-blue-600",
      "rounded-lg",
    );
  });
});
