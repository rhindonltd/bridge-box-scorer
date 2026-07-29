import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { scheduleGame } from "./scheduler";
import { BridgeTimerEngine } from "./bridge-timer-engine";
import type { TimerState } from "./timer-state";

describe("scheduleGame", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function makeEngine(overrides: Partial<TimerState> = {}): BridgeTimerEngine {
    const state: TimerState = {
      version: 1,
      phase: "play",
      board: 1,
      round: 1,
      boardsPerRound: 3,
      totalRounds: 4,
      playDuration: 10,
      moveDuration: 5,
      isRunning: true,
      phaseStartedAt: Date.now(),
      remainingMs: null,
      ...overrides,
    };
    return new BridgeTimerEngine(state);
  }

  it("sets a timeout that calls nextPhase when it fires", async () => {
    const engine = makeEngine({ playDuration: 2, isRunning: true, phaseStartedAt: Date.now() });
    const deps = {
      updateTimerState: vi.fn().mockResolvedValue(undefined),
      broadcast: vi.fn(),
    };

    scheduleGame("INDIVIDUAL", "g1", engine, deps);

    // Advance past the delay (remaining + 1000ms)
    await vi.advanceTimersByTimeAsync(4000);

    expect(deps.updateTimerState).toHaveBeenCalled();
    expect(deps.broadcast).toHaveBeenCalledWith("g1", expect.any(Object));
  });

  it("does not schedule if engine is not running", () => {
    const engine = makeEngine({ isRunning: false, phaseStartedAt: null, remainingMs: 5000 });
    const deps = {
      updateTimerState: vi.fn().mockResolvedValue(undefined),
      broadcast: vi.fn(),
    };

    scheduleGame("INDIVIDUAL", "g1", engine, deps);

    vi.advanceTimersByTime(10000);

    expect(deps.updateTimerState).not.toHaveBeenCalled();
  });

  it("does not schedule if phase is finished", () => {
    const engine = makeEngine({ phase: "finished", isRunning: false });
    const deps = {
      updateTimerState: vi.fn().mockResolvedValue(undefined),
      broadcast: vi.fn(),
    };

    scheduleGame("INDIVIDUAL", "g1", engine, deps);

    vi.advanceTimersByTime(100000);

    expect(deps.updateTimerState).not.toHaveBeenCalled();
  });

  it("cancels a previous schedule when called again for same game", async () => {
    const engine = makeEngine({ playDuration: 10, isRunning: true, phaseStartedAt: Date.now() });
    const deps = {
      updateTimerState: vi.fn().mockResolvedValue(undefined),
      broadcast: vi.fn(),
    };

    scheduleGame("PAIR", "g2", engine, deps);

    // Schedule again (should cancel previous)
    const engine2 = makeEngine({ playDuration: 5, isRunning: true, phaseStartedAt: Date.now() });
    scheduleGame("PAIR", "g2", engine2, deps);

    // Advance enough for second but not first
    await vi.advanceTimersByTimeAsync(7000);

    // Should have been called from the second schedule
    expect(deps.updateTimerState).toHaveBeenCalled();
  });
});
