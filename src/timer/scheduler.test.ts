import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { scheduleGame, cancelGameSchedule } from "./scheduler";
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
    const engine = makeEngine({
      playDuration: 2,
      isRunning: true,
      phaseStartedAt: Date.now(),
    });
    const deps = {
      updateTimerState: vi.fn().mockResolvedValue(undefined),
      broadcast: vi.fn(),
    };

    scheduleGame("g1", "A", engine, deps);

    // Advance past the delay (remaining + 1000ms)
    await vi.advanceTimersByTimeAsync(4000);

    expect(deps.updateTimerState).toHaveBeenCalledWith(
      "g1",
      "A",
      expect.any(Object),
    );
    expect(deps.broadcast).toHaveBeenCalledWith(
      "g1",
      "A",
      expect.any(Object),
    );
  });

  it("does not schedule if engine is not running", () => {
    const engine = makeEngine({
      isRunning: false,
      phaseStartedAt: null,
      remainingMs: 5000,
    });
    const deps = {
      updateTimerState: vi.fn().mockResolvedValue(undefined),
      broadcast: vi.fn(),
    };

    scheduleGame("g1", "A", engine, deps);

    vi.advanceTimersByTime(10000);

    expect(deps.updateTimerState).not.toHaveBeenCalled();
  });

  it("does not schedule if phase is finished", () => {
    const engine = makeEngine({ phase: "finished", isRunning: false });
    const deps = {
      updateTimerState: vi.fn().mockResolvedValue(undefined),
      broadcast: vi.fn(),
    };

    scheduleGame("g1", "A", engine, deps);

    vi.advanceTimersByTime(100000);

    expect(deps.updateTimerState).not.toHaveBeenCalled();
  });

  it("does not schedule if phase is finished even when isRunning is true", () => {
    const engine = makeEngine({
      phase: "finished",
      isRunning: true,
      phaseStartedAt: Date.now(),
    });
    const deps = {
      updateTimerState: vi.fn().mockResolvedValue(undefined),
      broadcast: vi.fn(),
    };

    scheduleGame("g1", "A", engine, deps);

    vi.advanceTimersByTime(100000);

    expect(deps.updateTimerState).not.toHaveBeenCalled();
  });

  it("cancels a previous schedule when called again for same game+section", async () => {
    const engine = makeEngine({
      playDuration: 10,
      isRunning: true,
      phaseStartedAt: Date.now(),
    });
    const deps = {
      updateTimerState: vi.fn().mockResolvedValue(undefined),
      broadcast: vi.fn(),
    };

    scheduleGame("g2", "A", engine, deps);

    // Schedule again (should cancel previous)
    const engine2 = makeEngine({
      playDuration: 5,
      isRunning: true,
      phaseStartedAt: Date.now(),
    });
    scheduleGame("g2", "A", engine2, deps);

    // Advance enough for second but not first
    await vi.advanceTimersByTimeAsync(7000);

    // Should have been called from the second schedule
    expect(deps.updateTimerState).toHaveBeenCalled();
  });

  it("schedules sections of the same game independently", async () => {
    const deps = {
      updateTimerState: vi.fn().mockResolvedValue(undefined),
      broadcast: vi.fn(),
    };

    // Section A: short play so it fires soon; Section B: long play.
    const engineA = makeEngine({
      playDuration: 2,
      isRunning: true,
      phaseStartedAt: Date.now(),
    });
    const engineB = makeEngine({
      playDuration: 60,
      isRunning: true,
      phaseStartedAt: Date.now(),
    });

    scheduleGame("g3", "A", engineA, deps);
    scheduleGame("g3", "B", engineB, deps);

    // Cancelling B must not affect A's pending fire.
    cancelGameSchedule("g3", "B");

    await vi.advanceTimersByTimeAsync(4000);

    // Only A fired.
    expect(deps.updateTimerState).toHaveBeenCalledTimes(1);
    expect(deps.updateTimerState).toHaveBeenCalledWith(
      "g3",
      "A",
      expect.any(Object),
    );
  });
});
