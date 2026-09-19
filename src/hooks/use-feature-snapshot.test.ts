import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockOn = vi.fn();
const mockOff = vi.fn();
const mockEmitWithAck = vi.fn();
const mockEmitEvent = vi.fn();

vi.mock("@/lib/socket", () => ({
  getSocket: () => ({ on: mockOn, off: mockOff }),
  emitWithAck: (...args: unknown[]) => mockEmitWithAck(...args),
  emitEvent: (...args: unknown[]) => mockEmitEvent(...args),
}));

import { useFeatureSnapshot } from "./use-feature-snapshot";
import { SocketEvents } from "@/socket/socket-events";

function baseConfig(over: Record<string, unknown> = {}) {
  return {
    requestEvent: "feature:requestState",
    syncEvent: "feature:sync",
    leaveEvent: "feature:leave",
    params: { gameId: "g1" },
    apply: vi.fn(),
    onRequestError: vi.fn(),
    deps: ["g1"],
    ...over,
  };
}

/** Grab the handler registered for a given socket event. */
function handlerFor(event: string) {
  const call = mockOn.mock.calls.find((c) => c[0] === event);
  return call?.[1] as (payload: unknown) => void;
}

describe("useFeatureSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEmitWithAck.mockResolvedValue(null);
  });

  it("requests the snapshot on mount and applies the ack payload", async () => {
    const apply = vi.fn();
    mockEmitWithAck.mockResolvedValue({ value: 1 });

    await act(async () => {
      renderHook(() => useFeatureSnapshot(baseConfig({ apply })));
    });

    expect(mockEmitWithAck).toHaveBeenCalledWith("feature:requestState", {
      gameId: "g1",
    });
    expect(apply).toHaveBeenCalledWith({ value: 1 });
  });

  it("calls onRequestError when the request rejects", async () => {
    const onRequestError = vi.fn();
    mockEmitWithAck.mockRejectedValue(new Error("timeout"));

    await act(async () => {
      renderHook(() => useFeatureSnapshot(baseConfig({ onRequestError })));
    });

    expect(onRequestError).toHaveBeenCalledTimes(1);
  });

  it("applies pushed sync events while mounted", async () => {
    const apply = vi.fn();
    await act(async () => {
      renderHook(() => useFeatureSnapshot(baseConfig({ apply })));
    });
    apply.mockClear();

    act(() => handlerFor("feature:sync")({ value: 2 }));

    expect(apply).toHaveBeenCalledWith({ value: 2 });
  });

  it("re-requests the snapshot on reconnect", async () => {
    await act(async () => {
      renderHook(() => useFeatureSnapshot(baseConfig()));
    });
    expect(mockEmitWithAck).toHaveBeenCalledTimes(1);

    await act(async () => {
      handlerFor(SocketEvents.CONNECT)(undefined);
    });

    expect(mockEmitWithAck).toHaveBeenCalledTimes(2);
  });

  it("registers and cleans up extra listeners and leaves the room on unmount", async () => {
    const extra = vi.fn();
    let unmount!: () => void;
    await act(async () => {
      const r = renderHook(() =>
        useFeatureSnapshot(
          baseConfig({ extraListeners: [["feature:cleared", extra]] }),
        ),
      );
      unmount = r.unmount;
    });

    expect(mockOn).toHaveBeenCalledWith("feature:cleared", extra);

    act(() => unmount());

    expect(mockOff).toHaveBeenCalledWith("feature:cleared", extra);
    expect(mockEmitEvent).toHaveBeenCalledWith("feature:leave", {
      gameId: "g1",
    });
  });

  it("drops a sync that arrives after unmount (cancelled guard)", async () => {
    const apply = vi.fn();
    let unmount!: () => void;
    await act(async () => {
      const r = renderHook(() => useFeatureSnapshot(baseConfig({ apply })));
      unmount = r.unmount;
    });

    const sync = handlerFor("feature:sync");
    act(() => unmount());
    apply.mockClear();

    // The retained handler is invoked after unmount; the cancelled flag must
    // stop it from applying.
    act(() => sync({ value: 99 }));

    expect(apply).not.toHaveBeenCalled();
  });

  it("drops a late request ack that resolves after unmount", async () => {
    const apply = vi.fn();
    const onRequestError = vi.fn();
    let resolve!: (v: unknown) => void;
    mockEmitWithAck.mockReturnValue(
      new Promise((res) => {
        resolve = res;
      }),
    );

    let unmount!: () => void;
    await act(async () => {
      const r = renderHook(() =>
        useFeatureSnapshot(baseConfig({ apply, onRequestError })),
      );
      unmount = r.unmount;
    });

    act(() => unmount());
    await act(async () => {
      resolve({ value: 5 });
      await Promise.resolve();
    });

    expect(apply).not.toHaveBeenCalled();
    expect(onRequestError).not.toHaveBeenCalled();
  });
});
