import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const handlers: Record<string, (...a: any[]) => void> = {};
const mockEmitWithAck = vi.fn();
const mockEmitEvent = vi.fn();
vi.mock("@/lib/socket", () => ({
  getSocket: () => ({
    on: (e: string, h: any) => {
      handlers[e] = h;
    },
    off: vi.fn(),
  }),
  emitWithAck: (...a: unknown[]) => mockEmitWithAck(...a),
  emitEvent: (...a: unknown[]) => mockEmitEvent(...a),
}));

import { useRoundResults } from "./useRoundResults";
import { SocketEvents } from "@/socket/socket-events";

const inst = (boardNumber: number) => ({ boardNumber }) as any;

describe("useRoundResults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(handlers)) delete handlers[k];
  });

  it("is null until the snapshot arrives, then keyed by board", async () => {
    mockEmitWithAck.mockResolvedValue({
      boards: [{ boardNumber: 1, instances: [inst(1)] }],
    });
    const { result } = renderHook(() => useRoundResults("g1", [1, 2]));
    expect(result.current).toBeNull();
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(mockEmitWithAck).toHaveBeenCalledWith(
      SocketEvents.REQUEST_STATE_ROUND_RESULTS,
      { gameId: "g1", boardNumbers: [1, 2] },
    );
    expect(result.current!.get(1)).toEqual([inst(1)]);
  });

  it("falls back to an empty map when the ack is null", async () => {
    mockEmitWithAck.mockResolvedValue(null);
    const { result } = renderHook(() => useRoundResults("g1", [1]));
    await waitFor(() => expect(result.current?.size).toBe(0));
  });

  it("falls back to an empty map when the request fails", async () => {
    mockEmitWithAck.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useRoundResults("g1", [1]));
    await waitFor(() => expect(result.current?.size).toBe(0));
  });

  it("merges a sync for a round board and ignores other boards", async () => {
    mockEmitWithAck.mockResolvedValue({ boards: [] });
    const { result } = renderHook(() => useRoundResults("g1", [1]));
    await waitFor(() => expect(result.current).not.toBeNull());
    act(() =>
      handlers[SocketEvents.ROUND_RESULTS_SYNC]({
        boardNumber: 1,
        instances: [inst(1)],
      }),
    );
    expect(result.current!.get(1)).toEqual([inst(1)]);
    act(() =>
      handlers[SocketEvents.ROUND_RESULTS_SYNC]({
        boardNumber: 9,
        instances: [inst(9)],
      }),
    );
    expect(result.current!.has(9)).toBe(false);
  });

  it("merges a sync that arrives before the snapshot", async () => {
    let resolve!: (v: unknown) => void;
    mockEmitWithAck.mockReturnValue(new Promise((r) => (resolve = r)));
    const { result } = renderHook(() => useRoundResults("g1", [1]));
    act(() =>
      handlers[SocketEvents.ROUND_RESULTS_SYNC]({
        boardNumber: 1,
        instances: [inst(1)],
      }),
    );
    expect(result.current!.get(1)).toEqual([inst(1)]);
    await act(async () => resolve(null));
  });

  it("leaves the room on unmount", async () => {
    mockEmitWithAck.mockResolvedValue(null);
    const { unmount } = renderHook(() => useRoundResults("g1", [1]));
    unmount();
    expect(mockEmitEvent).toHaveBeenCalledWith(
      SocketEvents.LEAVE_ROUND_RESULTS,
      { gameId: "g1", boardNumbers: [1] },
    );
  });
});
