import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const mockOn = vi.fn();
const mockOff = vi.fn();

vi.mock("@/lib/socket", () => ({
  getSocket: () => ({ on: mockOn, off: mockOff }),
}));

const mockUseSWR = vi.fn();
const mockMutate = vi.fn();
vi.mock("swr", () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
  mutate: (...args: unknown[]) => mockMutate(...args),
}));

import { useGameStarted } from "./game-started";
import { SocketEvents } from "@/socket/socket-events";

describe("useGameStarted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSWR.mockReturnValue({
      data: { boards: [1, 2, 3] },
      isLoading: false,
      error: undefined,
    });
  });

  it("fetches the boards key", () => {
    renderHook(() => useGameStarted("g1"));
    expect(mockUseSWR).toHaveBeenCalledWith(
      "/api/games/g1/boards",
      expect.any(Function),
    );
  });

  it("reports started when boards have been dealt", () => {
    const { result } = renderHook(() => useGameStarted("g1"));
    expect(result.current.started).toBe(true);
  });

  it("reports not started when the board list is empty", () => {
    mockUseSWR.mockReturnValue({
      data: { boards: [] },
      isLoading: false,
      error: undefined,
    });
    const { result } = renderHook(() => useGameStarted("g1"));
    expect(result.current.started).toBe(false);
  });

  it("defaults to not started when there is no data yet", () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
    });
    const { result } = renderHook(() => useGameStarted("g1"));
    expect(result.current.started).toBe(false);
  });

  it("subscribes to GAME_UPDATED and CONNECT for revalidation", () => {
    renderHook(() => useGameStarted("g1"));
    expect(mockOn).toHaveBeenCalledWith(
      SocketEvents.GAME_UPDATED,
      expect.any(Function),
    );
    expect(mockOn).toHaveBeenCalledWith(
      SocketEvents.CONNECT,
      expect.any(Function),
    );
  });

  it("revalidates the boards key when the game updates", () => {
    renderHook(() => useGameStarted("g1"));
    const gameUpdatedHandler = mockOn.mock.calls.find(
      (c) => c[0] === SocketEvents.GAME_UPDATED,
    )?.[1];
    gameUpdatedHandler?.();
    expect(mockMutate).toHaveBeenCalledWith("/api/games/g1/boards");
  });
});
