import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
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

vi.mock("@/lib/fetcher", () => ({ fetcher: vi.fn() }));

import { GameProvider, useGame, useRequiredGame } from "./GameContext";
import { SocketEvents } from "@/socket/socket-events";
import type { BridgeGame } from "@/db/game-index/schema";

const initialGame = { gameId: "g1", eventName: "Monday Pairs" } as BridgeGame;
const mutate = vi.fn();

function wrapper(children: ReactNode) {
  return <GameProvider initialGame={initialGame}>{children}</GameProvider>;
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
});
