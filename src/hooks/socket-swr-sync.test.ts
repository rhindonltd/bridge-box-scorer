import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSocketSWRSync } from "./socket-swr-sync";

const mockOn = vi.fn();
const mockOff = vi.fn();

vi.mock("@/lib/socket", () => ({
  getSocket: () => ({
    on: mockOn,
    off: mockOff,
  }),
}));

const mockMutate = vi.fn();
vi.mock("swr", () => ({
  mutate: (...args: unknown[]) => mockMutate(...args),
}));

describe("useSocketSWRSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("subscribes to the socket event on mount", () => {
    const handler = vi.fn();

    renderHook(() => useSocketSWRSync("game:participants", handler));

    expect(mockOn).toHaveBeenCalledWith("game:participants", expect.any(Function));
  });

  it("unsubscribes from the socket event on unmount", () => {
    const handler = vi.fn();

    const { unmount } = renderHook(() =>
      useSocketSWRSync("game:participants", handler),
    );

    unmount();

    expect(mockOff).toHaveBeenCalledWith("game:participants", expect.any(Function));
  });

  it("calls SWR mutate when handler returns key and data", () => {
    const handler = vi.fn().mockReturnValue({
      key: "/api/games/123",
      data: { updated: true },
    });

    renderHook(() => useSocketSWRSync("game:participants", handler));

    // Get the internal handler registered with socket.on
    const internalHandler = mockOn.mock.calls[0][1];

    // Simulate the event firing
    const payload = { participants: [] };
    internalHandler(payload);

    expect(handler).toHaveBeenCalledWith(payload);
    expect(mockMutate).toHaveBeenCalledWith("/api/games/123", { updated: true }, false);
  });

  it("does not call SWR mutate when handler returns null", () => {
    const handler = vi.fn().mockReturnValue(null);

    renderHook(() => useSocketSWRSync("game:participants", handler));

    const internalHandler = mockOn.mock.calls[0][1];
    internalHandler({ participants: [] });

    expect(handler).toHaveBeenCalled();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("re-subscribes when deps change", () => {
    const handler = vi.fn().mockReturnValue(null);

    const { rerender } = renderHook(
      ({ dep }) => useSocketSWRSync("game:participants", handler, [dep]),
      { initialProps: { dep: "a" } },
    );

    expect(mockOn).toHaveBeenCalledTimes(1);

    rerender({ dep: "b" });

    expect(mockOff).toHaveBeenCalledTimes(1);
    expect(mockOn).toHaveBeenCalledTimes(2);
  });
});
