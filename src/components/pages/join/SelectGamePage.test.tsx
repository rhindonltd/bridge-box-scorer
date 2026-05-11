import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SelectGamePage from "./SelectGamePage";

// Mock SelectGame so we isolate page behavior
vi.mock("@/components/join/SelectGame", () => ({
  default: ({ games, onGameSelected }: any) => (
    <div data-testid="select-game">
      {games.length} games
      <button onClick={() => onGameSelected(games[0] ?? null)}>Select</button>
    </div>
  ),
}));

describe("SelectGamePage", () => {
  const baseProps = {
    games: [
      { id: 1, eventName: "Game 1" },
      { id: 2, eventName: "Game 2" },
    ] as any,
    onGameSelected: vi.fn(),
  };

  it("renders page header", () => {
    render(<SelectGamePage {...baseProps} />);

    expect(screen.getByText("Select Game")).toBeInTheDocument();
  });

  it("renders SelectGame component", () => {
    render(<SelectGamePage {...baseProps} />);

    expect(screen.getByTestId("select-game")).toBeInTheDocument();
  });

  it("passes games to SelectGame", () => {
    render(<SelectGamePage {...baseProps} />);

    expect(screen.getByText("2 games")).toBeInTheDocument();
  });

  it("calls onGameSelected from child", () => {
    const fn = vi.fn();

    render(<SelectGamePage {...baseProps} onGameSelected={fn} />);

    screen.getByText("Select").click();

    expect(fn).toHaveBeenCalled();
  });

  it("renders correct header styling", () => {
    const { container } = render(<SelectGamePage {...baseProps} />);

    const header = screen.getByText("Select Game").parentElement;

    expect(header).toHaveClass(
      "bg-blue-200",
      "py-2",
      "text-center",
      "font-bold",
    );
  });
});
