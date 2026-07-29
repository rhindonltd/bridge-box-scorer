import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BridgeTimerEngine } from "./bridge-timer-engine";
import type { TimerState } from "./timer-state";

function makeState(overrides: Partial<TimerState> = {}): TimerState {
  return {
    version: 1,
    phase: "play",
    board: 1,
    round: 1,
    boardsPerRound: 3,
    totalRounds: 5,
    playDuration: 420,
    moveDuration: 60,
    isRunning: false,
    phaseStartedAt: null,
    remainingMs: null,
    ...overrides,
  };
}

describe("BridgeTimerEngine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getState", () => {
    it("returns a copy of the state", () => {
      const engine = new BridgeTimerEngine(makeState());
      const state = engine.getState();
      expect(state.phase).toBe("play");
      expect(state.round).toBe(1);
    });
  });

  describe("getRemainingMs", () => {
    it("returns full phase duration when not running and no remainingMs", () => {
      const engine = new BridgeTimerEngine(makeState());
      expect(engine.getRemainingMs()).toBe(420_000);
    });

    it("returns remainingMs when paused", () => {
      const engine = new BridgeTimerEngine(
        makeState({ remainingMs: 200_000 }),
      );
      expect(engine.getRemainingMs()).toBe(200_000);
    });

    it("returns elapsed-adjusted time when running", () => {
      const now = Date.now();
      const engine = new BridgeTimerEngine(
        makeState({
          isRunning: true,
          phaseStartedAt: now - 10_000,
        }),
      );
      expect(engine.getRemainingMs(now)).toBe(410_000);
    });

    it("never returns negative", () => {
      const now = Date.now();
      const engine = new BridgeTimerEngine(
        makeState({
          isRunning: true,
          phaseStartedAt: now - 500_000,
        }),
      );
      expect(engine.getRemainingMs(now)).toBe(0);
    });

    it("returns move duration when in move phase", () => {
      const engine = new BridgeTimerEngine(makeState({ phase: "move" }));
      expect(engine.getRemainingMs()).toBe(60_000);
    });
  });

  describe("start", () => {
    it("sets isRunning to true", () => {
      const engine = new BridgeTimerEngine(makeState());
      engine.start();
      expect(engine.getState().isRunning).toBe(true);
    });

    it("does nothing when already running", () => {
      const engine = new BridgeTimerEngine(
        makeState({ isRunning: true, phaseStartedAt: Date.now() }),
      );
      const stateBefore = engine.getState();
      engine.start();
      expect(engine.getState().phaseStartedAt).toBe(stateBefore.phaseStartedAt);
    });

    it("does nothing when phase is finished", () => {
      const engine = new BridgeTimerEngine(makeState({ phase: "finished" }));
      engine.start();
      expect(engine.getState().isRunning).toBe(false);
    });

    it("resumes from remainingMs correctly", () => {
      const engine = new BridgeTimerEngine(
        makeState({ remainingMs: 100_000 }),
      );
      engine.start();
      const state = engine.getState();
      expect(state.isRunning).toBe(true);
      expect(state.remainingMs).toBeNull();
      // phaseStartedAt should be set so that elapsed = fullDuration - remaining
      const remaining = engine.getRemainingMs(Date.now());
      expect(remaining).toBe(100_000);
    });
  });

  describe("pause", () => {
    it("sets isRunning to false and captures remainingMs", () => {
      const now = Date.now();
      const engine = new BridgeTimerEngine(
        makeState({ isRunning: true, phaseStartedAt: now - 10_000 }),
      );
      engine.pause();
      const state = engine.getState();
      expect(state.isRunning).toBe(false);
      expect(state.phaseStartedAt).toBeNull();
      expect(state.remainingMs).toBe(410_000);
    });

    it("does nothing when not running", () => {
      const engine = new BridgeTimerEngine(makeState());
      engine.pause();
      expect(engine.getState().remainingMs).toBeNull();
    });
  });

  describe("reset", () => {
    it("resets to initial play state", () => {
      const engine = new BridgeTimerEngine(
        makeState({
          phase: "move",
          round: 3,
          isRunning: true,
          phaseStartedAt: Date.now(),
          remainingMs: 30_000,
        }),
      );
      engine.reset();
      const state = engine.getState();
      expect(state.phase).toBe("play");
      expect(state.round).toBe(1);
      expect(state.isRunning).toBe(false);
      expect(state.phaseStartedAt).toBeNull();
      expect(state.remainingMs).toBeNull();
    });
  });

  describe("nextPhase", () => {
    it("transitions from play to move", () => {
      const engine = new BridgeTimerEngine(makeState({ phase: "play" }));
      engine.nextPhase();
      expect(engine.getState().phase).toBe("move");
    });

    it("transitions from move to play", () => {
      const engine = new BridgeTimerEngine(makeState({ phase: "move" }));
      engine.nextPhase();
      expect(engine.getState().phase).toBe("play");
    });

    it("increments round when moving from play to move", () => {
      const engine = new BridgeTimerEngine(
        makeState({ phase: "play", round: 2 }),
      );
      engine.nextPhase();
      expect(engine.getState().round).toBe(3);
      expect(engine.getState().phase).toBe("move");
    });

    it("finishes when on last round transitioning from play", () => {
      const engine = new BridgeTimerEngine(
        makeState({ phase: "play", round: 5, totalRounds: 5 }),
      );
      engine.nextPhase();
      expect(engine.getState().phase).toBe("finished");
      expect(engine.getState().isRunning).toBe(false);
    });

    it("auto-starts next phase if was running", () => {
      const engine = new BridgeTimerEngine(
        makeState({ phase: "move", isRunning: true, phaseStartedAt: Date.now() }),
      );
      engine.nextPhase();
      expect(engine.getState().phase).toBe("play");
      expect(engine.getState().isRunning).toBe(true);
    });

    it("does not auto-start if was not running", () => {
      const engine = new BridgeTimerEngine(
        makeState({ phase: "move", isRunning: false }),
      );
      engine.nextPhase();
      expect(engine.getState().isRunning).toBe(false);
    });
  });

  describe("skipRound", () => {
    it("advances to next round in move phase", () => {
      const engine = new BridgeTimerEngine(
        makeState({ phase: "play", round: 2 }),
      );
      engine.skipRound();
      expect(engine.getState().round).toBe(3);
      expect(engine.getState().phase).toBe("move");
      expect(engine.getState().isRunning).toBe(false);
    });

    it("finishes when on last round", () => {
      const engine = new BridgeTimerEngine(
        makeState({ phase: "play", round: 5, totalRounds: 5 }),
      );
      engine.skipRound();
      expect(engine.getState().phase).toBe("finished");
    });
  });

  describe("updateConfig", () => {
    it("updates boardsPerRound and totalRounds", () => {
      const engine = new BridgeTimerEngine(makeState());
      engine.updateConfig(4, 7, 480, 90);
      const state = engine.getState();
      expect(state.boardsPerRound).toBe(4);
      expect(state.totalRounds).toBe(7);
      expect(state.playDuration).toBe(480);
      expect(state.moveDuration).toBe(90);
    });

    it("adjusts remainingMs when paused and duration changes", () => {
      // Paused with 300s remaining out of 420s play duration (120s elapsed)
      const engine = new BridgeTimerEngine(
        makeState({ remainingMs: 300_000, playDuration: 420 }),
      );
      // New play duration is 480s; elapsed 120s -> remaining = 480000-120000 = 360000
      engine.updateConfig(3, 5, 480, 60);
      expect(engine.getState().remainingMs).toBe(360_000);
    });
  });
});
