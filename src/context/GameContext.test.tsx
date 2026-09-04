import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";

const mockUseSWR = vi.fn();
vi.mock("swr", () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
}));

const socketOn = vi.fn();
const socketOff = vi.fn();
const socketEmit = vi.fn();
vi.mock("@/lib/socket", () => ({
  getSocket: () => ({ on: socketOn, off: socketOff, emit: socketEmit }),
}));

const mockFetcher = vi.fn();
vi.mock("@/lib/fetcher", () => ({ fetcher: (...args: unknown[]) => mockFetcher(...args) }));

import { GameProvider, useGame, useRequiredGame } from "./GameContext";
import { SocketEvents } from "@/socket/socket-events";
import type { BridgeGame } from "@/db/game-index/schema";

const initialGame = { gameId: "g1", eventName: "Monday Pairs" } as BridgeGame;
const mutate = vi.fn();

function wrapper(children: ReactNode) {
  return <GameProvider initialGame={initialGame}>{children}</GameProvider>;
}

function handlerFor(event: string) {
  const call = socketOn.mock.calls.find((c) => c[0] === event);
  return call![1] as (payload?: { game: BridgeGame }) => void;
}

describe("GameContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSWR.mockReturnValue({
      data: initialGame,
      isLoading: false,
      mutate,
    });
  });

  it("throws when useGame is used outside a provider", () => {
    expect(() => renderHook(() => useGame())).toThrow(
      /must be used within GameProvider/,
    );
  });

  it("exposes the game and joins/leaves the game room", () => {
    const { result, unmount } = renderHook(() => useGame(), {
      wrapper: ({ children }) => wrapper(children),
    });

    expect(result.current.game).toEqual(initialGame);
    expect(socketEmit).toHaveBeenCalledWith(SocketEvents.JOIN_GAME, {
      gameId: "g1",
    });

    unmount();
    expect(socketEmit).toHaveBeenCalledWith(SocketEvents.LEAVE_GAME, {
      gameId: "g1",
    });
  });

  it("useRequiredGame returns the game when present", () => {
    const { result } = renderHook(() => useRequiredGame(), {
      wrapper: ({ children }) => wrapper(children),
    });
    expect(result.current.game).toEqual(initialGame);
  });

  it("useRequiredGame throws when the game is not yet available", () => {
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: true, mutate });

    expect(() =>
      renderHook(() => useRequiredGame(), {
        wrapper: ({ children }) => wrapper(children),
      }),
    ).toThrow(/Game is not available/);
  });

  it("gameFetcher unwraps the { game } envelope from the HTTP response", async () => {
    renderHook(() => useGame(), {
      wrapper: ({ children }) => wrapper(children),
    });

    // The fetcher SWR was configured with (2nd useSWR arg).
    const passedFetcher = mockUseSWR.mock.calls[0][1] as (
      url: string,
    ) => Promise<BridgeGame>;
    mockFetcher.mockResolvedValue({ game: initialGame });

    await expect(passedFetcher("/api/game/g1")).resolves.toEqual(initialGame);
    expect(mockFetcher).toHaveBeenCalledWith("/api/game/g1");
  });

  it("re-joins the game room on reconnect", () => {
    renderHook(() => useGame(), {
      wrapper: ({ children }) => wrapper(children),
    });

    socketEmit.mockClear();
    act(() => handlerFor(SocketEvents.CONNECT)());
    expect(socketEmit).toHaveBeenCalledWith(SocketEvents.JOIN_GAME, {
      gameId: "g1",
    });
  });

  it("merges pushed GAME_UPDATED payloads into the SWR cache without revalidating", () => {
    renderHook(() => useGame(), {
      wrapper: ({ children }) => wrapper(children),
    });

    const updated = { gameId: "g1", eventName: "Tuesday Pairs" } as BridgeGame;
    act(() => handlerFor(SocketEvents.GAME_UPDATED)({ game: updated }));
    expect(mutate).toHaveBeenCalledWith(updated, false);
  });
});
