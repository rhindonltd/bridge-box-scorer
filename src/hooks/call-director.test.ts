import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  callDirector: vi.fn(),
  primeChime: vi.fn(),
  handler: null as null | ((p: { gameId: string; seat: string }) => void),
}));

vi.mock("@/lib/game-service", () => ({ callDirector: mocks.callDirector }));
vi.mock("@/lib/chime", () => ({ primeChime: mocks.primeChime }));
vi.mock("@/hooks/socket-event", () => ({
  useSocketEvent: (_event: string, handler: typeof mocks.handler) => {
    mocks.handler = handler;
  },
}));

import { useCallDirector } from "./call-director";

const table = {
  section: null,
  tableNumber: 3,
  roundNumber: 2,
  side: "NS" as const,
};

describe("useCallDirector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.handler = null;
  });

  it("starts closed and opens at the confirm step, unlocking audio", () => {
    const { result } = renderHook(() => useCallDirector("g1", "A1NS"));
    expect(result.current.state).toEqual({ step: "closed" });

    act(() => result.current.open());

    expect(result.current.state).toEqual({ step: "confirm" });
    expect(mocks.primeChime).toHaveBeenCalled();
  });

  it("closes again", () => {
    const { result } = renderHook(() => useCallDirector("g1", "A1NS"));
    act(() => result.current.open());
    act(() => result.current.close());
    expect(result.current.state).toEqual({ step: "closed" });
  });

  it("sends the call and reports the table and call count", async () => {
    mocks.callDirector.mockResolvedValue({ table, calls: 2 });
    const { result } = renderHook(() => useCallDirector("g1", "A1NS"));

    await act(() => result.current.confirm());

    expect(mocks.callDirector).toHaveBeenCalledWith("g1", "A1NS");
    expect(result.current.state).toEqual({ step: "called", table, calls: 2 });
  });

  it("shows the server's message when the call fails", async () => {
    mocks.callDirector.mockRejectedValue(new Error("Game is finalised"));
    const { result } = renderHook(() => useCallDirector("g1", "A1NS"));

    await act(() => result.current.confirm());

    expect(result.current.state).toEqual({
      step: "error",
      message: "Game is finalised",
    });
  });

  it("uses a default message for a non-Error failure", async () => {
    mocks.callDirector.mockRejectedValue("nope");
    const { result } = renderHook(() => useCallDirector("g1", "A1NS"));

    await act(() => result.current.confirm());

    expect(result.current.state).toEqual({
      step: "error",
      message: "Could not call the director",
    });
  });

  it("tells a calling device when a director is on the way", async () => {
    mocks.callDirector.mockResolvedValue({ table, calls: 1 });
    const { result } = renderHook(() => useCallDirector("g1", "A1NS"));
    await act(() => result.current.confirm());

    act(() => mocks.handler?.({ gameId: "g1", seat: "A1NS" }));

    expect(result.current.state).toEqual({ step: "answered" });
  });

  it("ignores an answer for another seat or game", async () => {
    mocks.callDirector.mockResolvedValue({ table, calls: 1 });
    const { result } = renderHook(() => useCallDirector("g1", "A1NS"));
    await act(() => result.current.confirm());

    act(() => mocks.handler?.({ gameId: "g1", seat: "A2NS" }));
    act(() => mocks.handler?.({ gameId: "g2", seat: "A1NS" }));

    expect(result.current.state.step).toBe("called");
  });

  it("ignores an answer when this device has not called", () => {
    const { result } = renderHook(() => useCallDirector("g1", "A1NS"));

    act(() => mocks.handler?.({ gameId: "g1", seat: "A1NS" }));

    expect(result.current.state).toEqual({ step: "closed" });
  });

  it("only reports the answer once", async () => {
    mocks.callDirector.mockResolvedValue({ table, calls: 1 });
    const { result } = renderHook(() => useCallDirector("g1", "A1NS"));
    await act(() => result.current.confirm());
    act(() => mocks.handler?.({ gameId: "g1", seat: "A1NS" }));
    act(() => result.current.close());

    act(() => mocks.handler?.({ gameId: "g1", seat: "A1NS" }));

    expect(result.current.state).toEqual({ step: "closed" });
  });
});
