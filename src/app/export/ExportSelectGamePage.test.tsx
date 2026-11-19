import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { BridgeGame } from "@/db/game-index/schema";

let currentData: BridgeGame[] | undefined = [];
let currentLoading = false;
const mockMutate = vi.hoisted(() => vi.fn());
vi.mock("swr", () => ({
  default: () => ({ data: currentData, isLoading: currentLoading }),
  useSWRConfig: () => ({ mutate: mockMutate }),
}));
vi.mock("@/lib/fetcher", () => ({ unwrapFetcher: () => vi.fn() }));

const socket = { on: vi.fn(), off: vi.fn() };
vi.mock("@/lib/socket", () => ({ getSocket: () => socket }));

vi.mock("@/components/common/SelectGame", () => ({
  SelectGame: ({
    headerTitle,
    games,
    emptyMessage,
    backHref,
    onGameSelected,
  }: {
    headerTitle: string;
    games: BridgeGame[];
    emptyMessage?: string;
    backHref?: string;
    onGameSelected: (id: string) => void;
  }) => (
    <div>
      <span>{headerTitle}</span>
      <span data-testid="count">{games.length}</span>
      <span data-testid="empty">{emptyMessage}</span>
      <span data-testid="back">{backHref}</span>
      <button onClick={() => onGameSelected("g1")}>pick</button>
    </div>
  ),
}));

import ExportSelectGamePage from "./ExportSelectGamePage";

describe("ExportSelectGamePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentData = [];
    currentLoading = false;
  });

  it("lists the finalised games under the Export Game title", () => {
    currentData = [{ gameId: "g1" }, { gameId: "g2" }] as BridgeGame[];
    render(<ExportSelectGamePage onGameSelected={vi.fn()} />);
    expect(screen.getByText("Export Game")).toBeInTheDocument();
    expect(screen.getByTestId("count")).toHaveTextContent("2");
    expect(screen.getByTestId("back")).toHaveTextContent("/");
  });

  it("treats not-yet-loaded data as an empty list", () => {
    currentData = undefined;
    render(<ExportSelectGamePage onGameSelected={vi.fn()} />);
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });
  it("explains an empty list", () => {
    render(<ExportSelectGamePage onGameSelected={vi.fn()} />);
    expect(screen.getByTestId("empty")).toHaveTextContent(
      "No finalised games yet",
    );
  });

  it("passes the chosen game id on", () => {
    const onGameSelected = vi.fn();
    render(<ExportSelectGamePage onGameSelected={onGameSelected} />);
    fireEvent.click(screen.getByText("pick"));
    expect(onGameSelected).toHaveBeenCalledWith("g1");
  });

  it("refreshes on reconnect and list changes, and unsubscribes on unmount", () => {
    const { unmount } = render(
      <ExportSelectGamePage onGameSelected={vi.fn()} />,
    );
    const events = socket.on.mock.calls.map((c) => c[0]);
    expect(events).toEqual(
      expect.arrayContaining(["connect", "joinable-games"]),
    );
    const handlers = socket.on.mock.calls.map((c) => c[1] as () => void);
    handlers.forEach((h) => h());
    expect(mockMutate).toHaveBeenCalledTimes(2);
    expect(mockMutate).toHaveBeenCalledWith("/api/games/finalised");
    unmount();
    expect(socket.off).toHaveBeenCalledTimes(2);
  });
});
