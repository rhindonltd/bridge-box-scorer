import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSocketEvent } from "./socket-event";

const mockOn = vi.fn();
const mockOff = vi.fn();

vi.mock("@/lib/socket", () => ({
  getSocket: () => ({
    on: mockOn,
    off: mockOff,
  }),
}));

describe("useSocketEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("subscribes to the socket event on mount", () => {
    const handler = vi.fn();

    renderHook(() => useSocketEvent("test-event", handler));

    expect(mockOn).toHaveBeenCalledWith("test-event", handler);
  });

  it("unsubscribes from the socket event on unmount", () => {
    const handler = vi.fn();

    const { unmount } = renderHook(() => useSocketEvent("test-event", handler));

    unmount();

    expect(mockOff).toHaveBeenCalledWith("test-event", handler);
  });

  it("invokes handler when event fires", () => {
    const handler = vi.fn();

    renderHook(() => useSocketEvent("data-event", handler));

    // Simulate the socket firing the event by calling the registered handler
    const registeredHandler = mockOn.mock.calls[0][1];
    registeredHandler({ foo: "bar" });

    expect(handler).toHaveBeenCalledWith({ foo: "bar" });
  });

  it("re-subscribes when deps change", () => {
    const handler = vi.fn();

    const { rerender } = renderHook(
      ({ dep }) => useSocketEvent("evt", handler, [dep]),
      { initialProps: { dep: 1 } },
    );

    expect(mockOn).toHaveBeenCalledTimes(1);

    rerender({ dep: 2 });

    // Should have unsubscribed from the old and resubscribed
    expect(mockOff).toHaveBeenCalledTimes(1);
    expect(mockOn).toHaveBeenCalledTimes(2);
  });
});
