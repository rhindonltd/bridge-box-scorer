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

import { useStartCheck } from "./start-check";
import { SocketEvents } from "@/socket/socket-events";

describe("useStartCheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSWR.mockReturnValue({
      data: { canStart: true, problems: [], sitOutSeat: "3EW" },
      isLoading: false,
      error: undefined,
    });
  });

  it("fetches the start-check key", () => {
    renderHook(() => useStartCheck("g1"));
    expect(mockUseSWR).toHaveBeenCalledWith(
      "/api/games/g1/start-check",
      expect.any(Function),
    );
  });

  it("exposes canStart, problems and sitOutSeat from the response", () => {
    const { result } = renderHook(() => useStartCheck("g1"));
    expect(result.current.canStart).toBe(true);
    expect(result.current.problems).toEqual([]);
    expect(result.current.sitOutSeat).toBe("3EW");
  });

  it("defaults to canStart false when there is no data yet", () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
    });
    const { result } = renderHook(() => useStartCheck("g1"));
    expect(result.current.canStart).toBe(false);
    expect(result.current.problems).toEqual([]);
  });

  it("subscribes to GAME_UPDATED and CONNECT for revalidation", () => {
    renderHook(() => useStartCheck("g1"));
    expect(mockOn).toHaveBeenCalledWith(
      SocketEvents.GAME_UPDATED,
      expect.any(Function),
    );
    expect(mockOn).toHaveBeenCalledWith(
      SocketEvents.CONNECT,
      expect.any(Function),
    );
  });

  it("revalidates the start-check key when the game updates", () => {
    renderHook(() => useStartCheck("g1"));
    const gameUpdatedHandler = mockOn.mock.calls.find(
      (c) => c[0] === SocketEvents.GAME_UPDATED,
    )?.[1];
    gameUpdatedHandler?.();
    expect(mockMutate).toHaveBeenCalledWith("/api/games/g1/start-check");
  });
});
