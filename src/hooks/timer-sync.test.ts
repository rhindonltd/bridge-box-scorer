import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimerSync } from "./timer-sync";

const mockOn = vi.fn();
const mockOff = vi.fn();

vi.mock("@/lib/socket", () => ({
  getSocket: () => ({
    on: mockOn,
    off: mockOff,
  }),
}));

describe("useTimerSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with timerState as null and isConnected false", () => {
    const { result } = renderHook(() => useTimerSync());

    expect(result.current.timerState).toBeNull();
    expect(result.current.isConnected).toBe(false);
  });

  it("subscribes to timer:sync event on mount", () => {
    renderHook(() => useTimerSync());

    expect(mockOn).toHaveBeenCalledWith("timer:sync", expect.any(Function));
  });

  it("updates timerState when sync event fires", () => {
    const { result } = renderHook(() => useTimerSync());

    const syncHandler = mockOn.mock.calls[0][1];

    const payload = {
      version: 1,
      phase: "play" as const,
      board: 1,
      round: 1,
      boardsPerRound: 3,
      totalRounds: 5,
      playDuration: 420,
      moveDuration: 60,
      isRunning: true,
      phaseStartedAt: 1000,
      remainingMs: null,
      serverNow: Date.now(),
    };

    act(() => {
      syncHandler(payload);
    });

    expect(result.current.timerState).toEqual({
      version: 1,
      phase: "play",
      board: 1,
      round: 1,
      boardsPerRound: 3,
      totalRounds: 5,
      playDuration: 420,
      moveDuration: 60,
      isRunning: true,
      phaseStartedAt: 1000,
      remainingMs: null,
    });
    expect(result.current.isConnected).toBe(true);
  });

  it("calculates time offset from serverNow", () => {
    vi.spyOn(Date, "now").mockReturnValue(1000);

    const { result } = renderHook(() => useTimerSync());

    const syncHandler = mockOn.mock.calls[0][1];

    const payload = {
      version: 1,
      phase: "play" as const,
      board: 1,
      round: 1,
      boardsPerRound: 3,
      totalRounds: 5,
      playDuration: 420,
      moveDuration: 60,
      isRunning: false,
      phaseStartedAt: null,
      remainingMs: null,
      serverNow: 1500, // Server is 500ms ahead
    };

    act(() => {
      syncHandler(payload);
    });

    // now() should return Date.now() + offset (1500 - 1000 = 500 offset)
    vi.spyOn(Date, "now").mockReturnValue(2000);
    expect(result.current.now()).toBe(2500);

    vi.restoreAllMocks();
  });

  it("now() returns Date.now() when no offset applied", () => {
    vi.spyOn(Date, "now").mockReturnValue(5000);

    const { result } = renderHook(() => useTimerSync());

    // Before any sync event, offset is 0
    expect(result.current.now()).toBe(5000);

    vi.restoreAllMocks();
  });
});
