import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { BridgeGame } from "@/db/game-index/schema";

let currentData: BridgeGame[] | undefined = [];
let currentLoading = false;
let capturedKey: unknown;
vi.mock("swr", () => ({
  default: (key: unknown) => {
    capturedKey = key;
    return { data: currentData, isLoading: currentLoading };
  },
}));
vi.mock("@/lib/fetcher", () => ({ unwrapFetcher: () => vi.fn() }));

vi.mock("@/components/common/SelectGame", () => ({
  SelectGame: ({
    headerTitle,
    games,
    isLoading,
    onGameSelected,
    backHref,
    topContent,
    listHeading,
    emptyMessage,
  }: {
    headerTitle: string;
    games: BridgeGame[];
    isLoading: boolean;
    onGameSelected: (id: string, name?: string) => void;
    backHref?: string;
    topContent?: React.ReactNode;
    listHeading?: string;
    emptyMessage?: string;
  }) => (
    <div>
      <h1>{headerTitle}</h1>
      {topContent}
      <span data-testid="count">{games.length}</span>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="back">{backHref}</span>
      <span data-testid="heading">{listHeading}</span>
      <span data-testid="empty">{emptyMessage}</span>
      <button onClick={() => onGameSelected("g1", "Wed")}>pick</button>
    </div>
  ),
}));

import CreateSelectGamePage from "./CreateSelectGamePage";

describe("CreateSelectGamePage", () => {
  beforeEach(() => {
    currentData = [];
    currentLoading = false;
  });

  it("offers Create Game, which opens the new-game form", () => {
    render(<CreateSelectGamePage onGameSelected={vi.fn()} />);
    expect(
      screen.getByRole("heading", { name: "Create Game" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New Game" })).toHaveAttribute(
      "href",
      "/create/new",
    );
  });

  it("lists the games not started yet", () => {
    currentData = [{ gameId: "g1" }, { gameId: "g2" }] as BridgeGame[];
    render(<CreateSelectGamePage onGameSelected={vi.fn()} />);
    expect(capturedKey).toBe("/api/games/not-started");
    expect(screen.getByTestId("count")).toHaveTextContent("2");
    expect(screen.getByTestId("heading")).toHaveTextContent("Not started yet");
    expect(screen.getByTestId("back")).toHaveTextContent("/");
  });

  it("shows an empty list while the data is missing, with its own message", () => {
    currentData = undefined;
    currentLoading = true;
    render(<CreateSelectGamePage onGameSelected={vi.fn()} />);
    expect(screen.getByTestId("count")).toHaveTextContent("0");
    expect(screen.getByTestId("loading")).toHaveTextContent("true");
    expect(screen.getByTestId("empty")).toHaveTextContent(
      "No games are waiting to be started.",
    );
  });

  it("passes the chosen game on", () => {
    const onGameSelected = vi.fn();
    render(<CreateSelectGamePage onGameSelected={onGameSelected} />);
    fireEvent.click(screen.getByText("pick"));
    expect(onGameSelected).toHaveBeenCalledWith("g1", "Wed");
  });
});
