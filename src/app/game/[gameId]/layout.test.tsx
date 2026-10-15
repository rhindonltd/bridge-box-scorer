import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  // The real notFound() throws to unwind rendering into the not-found boundary;
  // mirror that so a test can assert it fired and the provider is never reached.
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

const mockFindGameById = vi.fn();
vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: (gameId: string) => mockFindGameById(gameId),
}));

vi.mock("@/context/GameContext", () => ({
  GameProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="game-provider">{children}</div>
  ),
}));

vi.mock("./GameGate", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="game-gate">{children}</div>
  ),
}));

import { notFound } from "next/navigation";
import GameLayout from "./layout";

function paramsFor(gameId: string) {
  return Promise.resolve({ gameId });
}

describe("GameLayout", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the not-found screen when the game no longer exists", async () => {
    // A deleted (or bogus) game resolves to null — the layout should surface
    // the "page not found" screen rather than render the provider, so a public
    // display viewing a deleted game is told it is gone.
    mockFindGameById.mockResolvedValue(null);

    await expect(
      GameLayout({ children: <div>child</div>, params: paramsFor("gone") }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  it("renders the game provider and children for an existing game", async () => {
    mockFindGameById.mockResolvedValue({ gameId: "g1", eventName: "Tuesday" });

    const ui = await GameLayout({
      children: <div>child</div>,
      params: paramsFor("g1"),
    });
    render(ui);

    expect(screen.getByTestId("game-provider")).toBeInTheDocument();
    expect(screen.getByTestId("game-gate")).toBeInTheDocument();
    expect(screen.getByText("child")).toBeInTheDocument();
    expect(notFound).not.toHaveBeenCalled();
  });
});
