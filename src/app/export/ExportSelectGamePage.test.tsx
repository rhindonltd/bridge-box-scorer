import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { BridgeGame } from "@/db/game-index/schema";

let currentData: BridgeGame[] | undefined = [];
let currentLoading = false;
vi.mock("swr", () => ({
  default: () => ({ data: currentData, isLoading: currentLoading }),
  useSWRConfig: () => ({ mutate: vi.fn() }),
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
    unmount();
    expect(socket.off).toHaveBeenCalledTimes(2);
  });
});
