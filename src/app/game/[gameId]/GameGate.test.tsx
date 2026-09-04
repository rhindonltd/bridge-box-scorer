import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("@/app/loading", () => ({
  default: () => <div>loading-spinner</div>,
}));
vi.mock("@/context/GameContext", () => ({
  useGame: vi.fn(),
}));

import { notFound } from "next/navigation";
import { useGame } from "@/context/GameContext";
import GameGate from "./GameGate";

describe("GameGate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the loading state while the game is loading", () => {
    vi.mocked(useGame).mockReturnValue({
      game: null,
      isLoading: true,
    } as never);

    render(
      <GameGate>
        <div>child</div>
      </GameGate>,
    );

    expect(screen.getByText("loading-spinner")).toBeInTheDocument();
    expect(screen.queryByText("child")).not.toBeInTheDocument();
  });

  it("calls notFound when there is no game", () => {
    vi.mocked(useGame).mockReturnValue({
      game: null,
      isLoading: false,
    } as never);

    expect(() =>
      render(
        <GameGate>
          <div>child</div>
        </GameGate>,
      ),
    ).toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  it("renders children once the game is ready", () => {
    vi.mocked(useGame).mockReturnValue({
      game: { gameId: "g1" },
      isLoading: false,
    } as never);

    render(
      <GameGate>
        <div>child</div>
      </GameGate>,
    );

    expect(screen.getByText("child")).toBeInTheDocument();
    expect(notFound).not.toHaveBeenCalled();
  });
});
