import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SelectGamePage from "./SelectGamePage";

// Stub the presentational child so we isolate page wiring.
vi.mock("@/components/common/SelectGame", () => ({
  SelectGame: ({ headerTitle, games, onGameSelected }: any) => (
    <div data-testid="select-game">
      <span>{headerTitle}</span>
      <span data-testid="game-count">{games.length} games</span>
      <button onClick={() => onGameSelected("picked")}>Select</button>
    </div>
  ),
}));

// The page fetches joinable games via SWR + fetcher and subscribes to sockets.
vi.mock("@/lib/fetcher", () => ({
  fetcher: vi.fn(async () => ({ games: [{ gameId: "g1" }, { gameId: "g2" }] })),
}));

const onHandler = vi.fn();
const offHandler = vi.fn();
vi.mock("@/lib/socket", () => ({
  getSocket: () => ({ on: onHandler, off: offHandler }),
}));

describe("SelectGamePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes the header title through to SelectGame", () => {
    render(
      <SelectGamePage headerTitle="Header Title" onGameSelected={vi.fn()} />,
    );
    expect(screen.getByText("Header Title")).toBeInTheDocument();
  });

  it("forwards the selected game id to onGameSelected", () => {
    const fn = vi.fn();
    render(<SelectGamePage headerTitle="Header Title" onGameSelected={fn} />);
    fireEvent.click(screen.getByRole("button", { name: "Select" }));
    expect(fn).toHaveBeenCalledWith("picked");
  });

  it("subscribes to socket reconnect events", () => {
    render(
      <SelectGamePage headerTitle="Header Title" onGameSelected={vi.fn()} />,
    );
    expect(onHandler).toHaveBeenCalled();
  });
});
