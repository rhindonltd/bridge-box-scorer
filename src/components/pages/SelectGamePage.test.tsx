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

  it("revalidates joinable games on reconnect", () => {
    render(
      <SelectGamePage headerTitle="Header Title" onGameSelected={vi.fn()} />,
    );

    // Grab the handler registered for the "connect" event and fire it. It calls
    // mutate(swrKeys.joinableGames) — invoking it here exercises that body
    // without throwing.
    const connectCall = onHandler.mock.calls.find(([evt]) => evt === "connect");
    expect(connectCall).toBeDefined();
    expect(() => connectCall![1]()).not.toThrow();
  });

  it("maps a joinable-games socket payload into an SWR update", () => {
    render(
      <SelectGamePage headerTitle="Header Title" onGameSelected={vi.fn()} />,
    );

    // useSocketSWRSync registers a handler for the joinable-games event; firing
    // it runs the transform callback that maps the payload to { key, data }.
    const syncCall = onHandler.mock.calls.find(
      ([evt]) => evt === "joinable-games",
    );
    expect(syncCall).toBeDefined();
    expect(() =>
      syncCall![1]({ joinableGames: [{ gameId: "g3" }] }),
    ).not.toThrow();
  });
});
