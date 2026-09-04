import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SelectGame } from "./SelectGame";

describe("SelectGame", () => {
  const mockGames = [
    {
      gameId: "id-a",
      eventName: "Game A",
      eventDate: "2026-01-01",
      tables: 4,
    },
    {
      gameId: "id-b",
      eventName: "Game B",
      eventDate: "2026-01-02",
      tables: 5,
    },
  ] as any;

  it("shows empty state when no games exist", () => {
    render(
      <SelectGame headerTitle="Title" games={[]} onGameSelected={vi.fn()} />,
    );
    expect(
      screen.getByText("No games have been created yet."),
    ).toBeInTheDocument();
  });

  it("shows a loading spinner while loading", () => {
    const { container } = render(
      <SelectGame
        headerTitle="Title"
        games={[]}
        isLoading
        onGameSelected={vi.fn()}
      />,
    );
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders all game buttons", () => {
    render(
      <SelectGame
        headerTitle="Title"
        games={mockGames}
        onGameSelected={vi.fn()}
      />,
    );
    expect(screen.getByText("Game A")).toBeInTheDocument();
    expect(screen.getByText("Game B")).toBeInTheDocument();
  });

  it("calls onGameSelected with gameId and name when a game is clicked", () => {
    const fn = vi.fn();
    render(
      <SelectGame headerTitle="Title" games={mockGames} onGameSelected={fn} />,
    );
    fireEvent.click(screen.getByText("Game A"));
    expect(fn).toHaveBeenCalledWith("id-a", "Game A");
  });

  it("calls onGameSelected for second game", () => {
    const fn = vi.fn();
    render(
      <SelectGame headerTitle="Title" games={mockGames} onGameSelected={fn} />,
    );
    fireEvent.click(screen.getByText("Game B"));
    expect(fn).toHaveBeenCalledWith("id-b", "Game B");
  });

  it("renders one button per game", () => {
    render(
      <SelectGame
        headerTitle="Title"
        games={mockGames}
        onGameSelected={vi.fn()}
      />,
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
  });

  it("falls back to the raw date string when it is unparseable", () => {
    const games = [
      {
        gameId: "id-x",
        eventName: "Game X",
        eventDate: "not-a-date",
        tables: 3,
      },
    ] as any;
    render(
      <SelectGame headerTitle="Title" games={games} onGameSelected={vi.fn()} />,
    );
    expect(screen.getByText("not-a-date")).toBeInTheDocument();
  });

  it("applies button styling classes", () => {
    render(
      <SelectGame
        headerTitle="Title"
        games={mockGames}
        onGameSelected={vi.fn()}
      />,
    );
    const button = screen.getByText("Game A").closest("button");
    expect(button).toHaveClass("w-full", "bg-gray-50", "border", "rounded-xl");
  });
});
