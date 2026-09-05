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

import { useResultsComplete } from "./results-complete";
import { SocketEvents } from "@/socket/socket-events";

describe("useResultsComplete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSWR.mockReturnValue({
      data: { totalPlayable: 4, finalized: 4, allResultsIn: true },
      isLoading: false,
      error: undefined,
    });
  });

  it("fetches the results-summary key", () => {
    renderHook(() => useResultsComplete("g1"));
    expect(mockUseSWR).toHaveBeenCalledWith(
      "/api/games/g1/results-summary",
      expect.any(Function),
    );
  });

  it("reports complete when all playable boards are finalized", () => {
    const { result } = renderHook(() => useResultsComplete("g1"));
    expect(result.current.allResultsIn).toBe(true);
  });

  it("reports not complete when results are outstanding", () => {
    mockUseSWR.mockReturnValue({
      data: { totalPlayable: 4, finalized: 3, allResultsIn: false },
      isLoading: false,
      error: undefined,
    });
    const { result } = renderHook(() => useResultsComplete("g1"));
    expect(result.current.allResultsIn).toBe(false);
  });

  it("defaults to not complete when there is no data yet", () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
    });
    const { result } = renderHook(() => useResultsComplete("g1"));
    expect(result.current.allResultsIn).toBe(false);
  });

  it("subscribes to GAME_UPDATED and CONNECT for revalidation", () => {
    renderHook(() => useResultsComplete("g1"));
    expect(mockOn).toHaveBeenCalledWith(
      SocketEvents.GAME_UPDATED,
      expect.any(Function),
    );
    expect(mockOn).toHaveBeenCalledWith(
      SocketEvents.CONNECT,
      expect.any(Function),
    );
  });

  it("revalidates the results-summary key when the game updates", () => {
    renderHook(() => useResultsComplete("g1"));
    const gameUpdatedHandler = mockOn.mock.calls.find(
      (c) => c[0] === SocketEvents.GAME_UPDATED,
    )?.[1];
    gameUpdatedHandler?.();
    expect(mockMutate).toHaveBeenCalledWith("/api/games/g1/results-summary");
  });
});
