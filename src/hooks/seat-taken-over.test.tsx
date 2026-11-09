import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const handlers = new Map<string, (p?: any) => void>();
const socket = {
  on: vi.fn((e: string, h: (p?: any) => void) => handlers.set(e, h)),
  off: vi.fn((e: string) => handlers.delete(e)),
};
vi.mock("@/lib/socket", () => ({ getSocket: () => socket }));
const watchSeat = vi.fn();
vi.mock("@/lib/game-service", () => ({
  watchSeat: (...a: unknown[]) => watchSeat(...a),
}));

import { useSeatTakenOver } from "./seat-taken-over";
import { SocketEvents } from "@/socket/socket-events";

describe("useSeatTakenOver", () => {
  beforeEach(() => {
    handlers.clear();
    vi.clearAllMocks();
    watchSeat.mockResolvedValue("held");
  });

  it("is false while the seat is held, and checks on mount", async () => {
    const { result } = renderHook(() => useSeatTakenOver("g1", "A1NS"));
    await waitFor(() => expect(watchSeat).toHaveBeenCalledWith("g1", "A1NS"));
    expect(result.current).toBe(false);
  });

  it("flips on the live notice for this seat only", async () => {
    const { result } = renderHook(() => useSeatTakenOver("g1", "A1NS"));
    act(() =>
      handlers.get(SocketEvents.SEAT_TAKEN_OVER)!({
        gameId: "g1",
        seat: "A2NS",
      }),
    );
    expect(result.current).toBe(false);
    act(() =>
      handlers.get(SocketEvents.SEAT_TAKEN_OVER)!({
        gameId: "g1",
        seat: "A1NS",
      }),
    );
    expect(result.current).toBe(true);
  });

  it("flips when the server says the seat moved while offline", async () => {
    watchSeat.mockResolvedValue("moved");
    const { result } = renderHook(() => useSeatTakenOver("g1", "A1NS"));
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("re-checks on reconnect, and ignores 'unknown'", async () => {
    watchSeat.mockResolvedValue("unknown");
    const { result } = renderHook(() => useSeatTakenOver("g1", "A1NS"));
    await waitFor(() => expect(watchSeat).toHaveBeenCalledTimes(1));
    expect(result.current).toBe(false);
    watchSeat.mockResolvedValue("moved");
    act(() => handlers.get(SocketEvents.CONNECT)!());
    await waitFor(() => expect(result.current).toBe(true));
    expect(watchSeat).toHaveBeenCalledTimes(2);
  });
});
