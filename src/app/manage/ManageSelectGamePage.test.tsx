import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { BridgeGame } from "@/db/game-index/schema";

let currentData: BridgeGame[] | undefined = [];
let currentLoading = false;
let capturedFetcher: ((url: string) => Promise<BridgeGame[]>) | null = null;
vi.mock("swr", () => ({
  default: (_key: string, fetcher: (url: string) => Promise<BridgeGame[]>) => {
    capturedFetcher = fetcher;
    return { data: currentData, isLoading: currentLoading };
  },
}));

vi.mock("@/lib/fetcher", () => ({
  fetcher: vi.fn(),
}));

vi.mock("@/components/common/SelectGame", () => ({
  SelectGame: ({
    headerTitle,
    games,
    isLoading,
    onGameSelected,
  }: {
    headerTitle: string;
    games: BridgeGame[];
    isLoading: boolean;
    onGameSelected: (id: string, name?: string) => void;
  }) => (
    <div>
      <span>{headerTitle}</span>
      <span data-testid="count">{games.length}</span>
      <span data-testid="loading">{String(isLoading)}</span>
      <button onClick={() => onGameSelected("g1", "Tuesday")}>pick</button>
    </div>
  ),
}));

import { fetcher } from "@/lib/fetcher";
import ManageSelectGamePage from "./ManageSelectGamePage";

describe("ManageSelectGamePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentData = [];
    currentLoading = false;
    capturedFetcher = null;
  });

  it("passes fetched games and loading state to SelectGame and forwards selection", () => {
    currentData = [{ gameId: "g1" } as BridgeGame];
    currentLoading = true;
    const onGameSelected = vi.fn();

    render(<ManageSelectGamePage onGameSelected={onGameSelected} />);

    expect(screen.getByText("Manage Game")).toBeInTheDocument();
    expect(screen.getByTestId("count")).toHaveTextContent("1");
    expect(screen.getByTestId("loading")).toHaveTextContent("true");

    fireEvent.click(screen.getByText("pick"));
    expect(onGameSelected).toHaveBeenCalledWith("g1", "Tuesday");
  });

  it("defaults to an empty list when no data is returned", () => {
    currentData = undefined;
    render(<ManageSelectGamePage onGameSelected={vi.fn()} />);
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("unwraps the games payload through its SWR fetcher", async () => {
    render(<ManageSelectGamePage onGameSelected={vi.fn()} />);

    const games = [{ gameId: "g1" } as BridgeGame];
    vi.mocked(fetcher).mockResolvedValueOnce({ games });

    await expect(capturedFetcher!("/api/games/all")).resolves.toEqual(games);
    expect(fetcher).toHaveBeenCalledWith("/api/games/all");
  });
});
