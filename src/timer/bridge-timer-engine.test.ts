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
      const engine = new BridgeTimerEngine(makeState({ remainingMs: 200_000 }));
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

    it("returns full phase duration when running but phaseStartedAt is null", () => {
      const engine = new BridgeTimerEngine(
        makeState({ isRunning: true, phaseStartedAt: null }),
      );
      expect(engine.getRemainingMs()).toBe(420_000);
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
      const engine = new BridgeTimerEngine(makeState({ remainingMs: 100_000 }));
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
        makeState({
          phase: "move",
          isRunning: true,
          phaseStartedAt: Date.now(),
        }),
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


// ---- Corrected-behaviour tests: breaks, controls, live config ----

import type { BreakConfig } from "./timer-state";

function makeBreakState(overrides: Partial<TimerState> = {}): TimerState {
  return {
    version: 1,
    phase: "play",
    board: 1,
    round: 1,
    boardsPerRound: 3,
    totalRounds: 5,
    playDuration: 420,
    moveDuration: 60,
    breaks: [],
    warningSeconds: 60,
    isRunning: false,
    phaseStartedAt: null,
    remainingMs: null,
    breakDurationMs: null,
    ...overrides,
  };
}

const durationBreak = (afterRound: number, minutes: number): BreakConfig => ({
  afterRound,
  mode: "duration",
  durationSeconds: minutes * 60,
});

describe("BridgeTimerEngine - breaks", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("enters a break instead of move when a break follows the round", () => {
    const engine = new BridgeTimerEngine(
      makeBreakState({
        phase: "play",
        round: 1,
        breaks: [durationBreak(1, 10)],
      }),
    );

    engine.nextPhase();

    const state = engine.getState();
    expect(state.phase).toBe("break");
    expect(state.round).toBe(2);
    expect(state.breakDurationMs).toBe(600_000);
    expect(engine.getRemainingMs()).toBe(600_000);
  });

  it("uses a normal move when no break follows the round", () => {
    const engine = new BridgeTimerEngine(
      makeBreakState({ phase: "play", round: 1, breaks: [durationBreak(3, 10)] }),
    );

    engine.nextPhase();

    expect(engine.getState().phase).toBe("move");
    expect(engine.getState().round).toBe(2);
  });

  it("advances from break into the next round's play", () => {
    const engine = new BridgeTimerEngine(
      makeBreakState({
        phase: "break",
        round: 2,
        breakDurationMs: 600_000,
        remainingMs: 600_000,
        breaks: [durationBreak(1, 10)],
      }),
    );

    engine.nextPhase();

    const state = engine.getState();
    expect(state.phase).toBe("play");
    expect(state.round).toBe(2);
    expect(state.breakDurationMs).toBeNull();
    expect(engine.getRemainingMs()).toBe(420_000);
  });

  it("auto-continues running through a break", () => {
    const engine = new BridgeTimerEngine(
      makeBreakState({
        phase: "play",
        round: 1,
        isRunning: true,
        phaseStartedAt: Date.now(),
        breaks: [durationBreak(1, 10)],
      }),
    );

    engine.nextPhase();

    const state = engine.getState();
    expect(state.phase).toBe("break");
    expect(state.isRunning).toBe(true);
    // Break duration survives start() (it uses breakDurationMs, not remainingMs).
    expect(engine.getRemainingMs(Date.now())).toBe(600_000);
  });

  it("break survives being started (does not zero out)", () => {
    const engine = new BridgeTimerEngine(
      makeBreakState({
        phase: "break",
        round: 2,
        breakDurationMs: 300_000,
        remainingMs: 300_000,
        breaks: [durationBreak(1, 5)],
      }),
    );

    engine.start();

    expect(engine.getState().isRunning).toBe(true);
    expect(engine.getRemainingMs(Date.now())).toBe(300_000);
  });
});

describe("BridgeTimerEngine - previous / restart", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("restartPhase resets the current play phase to full duration, paused", () => {
    const engine = new BridgeTimerEngine(
      makeBreakState({
        phase: "play",
        isRunning: true,
        phaseStartedAt: Date.now() - 100_000,
      }),
    );

    engine.restartPhase();

    const state = engine.getState();
    expect(state.isRunning).toBe(false);
    expect(state.remainingMs).toBe(420_000);
  });

  it("previousPhase from move steps back to the previous round's play", () => {
    const engine = new BridgeTimerEngine(
      makeBreakState({ phase: "move", round: 3 }),
    );

    engine.previousPhase();

    const state = engine.getState();
    expect(state.phase).toBe("play");
    expect(state.round).toBe(2);
    expect(state.remainingMs).toBe(420_000);
  });

  it("previousPhase from play steps back into the preceding gap", () => {
    const engine = new BridgeTimerEngine(
      makeBreakState({ phase: "play", round: 3 }),
    );

    engine.previousPhase();

    const state = engine.getState();
    expect(state.phase).toBe("move");
    expect(state.round).toBe(3);
    expect(state.remainingMs).toBe(60_000);
  });

  it("previousPhase from play steps back into a preceding break when scheduled", () => {
    const engine = new BridgeTimerEngine(
      makeBreakState({ phase: "play", round: 3, breaks: [durationBreak(2, 8)] }),
    );

    engine.previousPhase();

    const state = engine.getState();
    expect(state.phase).toBe("break");
    expect(state.breakDurationMs).toBe(480_000);
  });

  it("previousPhase from the first play just restarts it", () => {
    const engine = new BridgeTimerEngine(
      makeBreakState({
        phase: "play",
        round: 1,
        isRunning: true,
        phaseStartedAt: Date.now() - 50_000,
      }),
    );

    engine.previousPhase();

    const state = engine.getState();
    expect(state.round).toBe(1);
    expect(state.phase).toBe("play");
    // Preserves running state.
    expect(state.isRunning).toBe(true);
    expect(engine.getRemainingMs(Date.now())).toBe(420_000);
  });

  it("previousPhase from finished steps back into the final play", () => {
    const engine = new BridgeTimerEngine(
      makeBreakState({ phase: "finished", round: 5, totalRounds: 5 }),
    );

    engine.previousPhase();

    expect(engine.getState().phase).toBe("play");
    expect(engine.getState().round).toBe(5);
  });
});

describe("BridgeTimerEngine - adjustTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds time to the current paused phase without changing stored duration", () => {
    const engine = new BridgeTimerEngine(
      makeBreakState({ phase: "play", remainingMs: 300_000 }),
    );

    engine.adjustTime(60_000);

    expect(engine.getState().remainingMs).toBe(360_000);
    // Not applied to future -> stored play duration unchanged.
    expect(engine.getState().playDuration).toBe(420);
  });

  it("subtracts time but never below zero", () => {
    const engine = new BridgeTimerEngine(
      makeBreakState({ phase: "play", remainingMs: 30_000 }),
    );

    engine.adjustTime(-60_000);

    expect(engine.getState().remainingMs).toBe(0);
  });

  it("applies to all subsequent play phases when requested", () => {
    const engine = new BridgeTimerEngine(
      makeBreakState({ phase: "play", remainingMs: 300_000, playDuration: 420 }),
    );

    engine.adjustTime(60_000, true);

    expect(engine.getState().playDuration).toBe(480);
    expect(engine.getState().remainingMs).toBe(360_000);
  });

  it("applies to all subsequent move phases when in a move phase", () => {
    const engine = new BridgeTimerEngine(
      makeBreakState({ phase: "move", round: 2, remainingMs: 30_000, moveDuration: 60 }),
    );

    engine.adjustTime(30_000, true);

    expect(engine.getState().moveDuration).toBe(90);
    // Play duration untouched.
    expect(engine.getState().playDuration).toBe(420);
  });

  it("grows a break's duration when adjusting during a break", () => {
    const engine = new BridgeTimerEngine(
      makeBreakState({
        phase: "break",
        round: 2,
        breakDurationMs: 300_000,
        remainingMs: 300_000,
      }),
    );

    engine.adjustTime(60_000);

    expect(engine.getState().breakDurationMs).toBe(360_000);
    expect(engine.getState().remainingMs).toBe(360_000);
  });

  it("does nothing when finished", () => {
    const engine = new BridgeTimerEngine(makeBreakState({ phase: "finished" }));
    engine.adjustTime(60_000);
    expect(engine.getState().phase).toBe("finished");
  });
});

describe("BridgeTimerEngine - updateConfig live edits", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("recomputes remaining for a RUNNING play phase and preserves elapsed", () => {
    const now = Date.now();
    const engine = new BridgeTimerEngine(
      makeBreakState({
        phase: "play",
        isRunning: true,
        phaseStartedAt: now - 120_000, // 120s elapsed of 420s
        playDuration: 420,
      }),
    );

    // New play duration 480s; elapsed 120s -> remaining should be 360s.
    engine.updateConfig(3, 5, 480, 60);

    expect(engine.getRemainingMs(now)).toBe(360_000);
    expect(engine.getState().playDuration).toBe(480);
  });

  it("applies break schedule and warning threshold", () => {
    const engine = new BridgeTimerEngine(makeBreakState());

    engine.updateConfig(3, 5, 420, 60, {
      breaks: [durationBreak(2, 10)],
      warningSeconds: 30,
    });

    expect(engine.getState().breaks).toEqual([durationBreak(2, 10)]);
    expect(engine.getState().warningSeconds).toBe(30);
  });

  it("does not wipe breaks when the breaks option is omitted", () => {
    const engine = new BridgeTimerEngine(
      makeBreakState({ breaks: [durationBreak(2, 10)] }),
    );

    engine.updateConfig(3, 5, 420, 60, { warningSeconds: 45 });

    expect(engine.getState().breaks).toEqual([durationBreak(2, 10)]);
    expect(engine.getState().warningSeconds).toBe(45);
  });
});

describe("BridgeTimerEngine - running-state and edge branches", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("getRemainingMs falls back to 0 for a break with no breakDurationMs", () => {
    const engine = new BridgeTimerEngine(
      makeBreakState({ phase: "break", breakDurationMs: null }),
    );
    // Paused, remainingMs null -> getPhaseDurationMs() -> breakDurationMs ?? 0.
    expect(engine.getRemainingMs()).toBe(0);
  });

  it("adjustTime re-anchors a RUNNING play phase (paused-equivalent remaining)", () => {
    const now = Date.now();
    const engine = new BridgeTimerEngine(
      makeBreakState({
        phase: "play",
        isRunning: true,
        phaseStartedAt: now - 120_000, // 300s remain of 420s
        playDuration: 420,
      }),
    );

    engine.adjustTime(60_000);

    const state = engine.getState();
    // Running -> remainingMs cleared, phaseStartedAt re-anchored.
    expect(state.remainingMs).toBeNull();
    expect(state.isRunning).toBe(true);
    // 300s remaining + 60s = 360s.
    expect(engine.getRemainingMs(now)).toBe(360_000);
  });

  it("adjustTime re-anchors a RUNNING move phase and grows future move duration", () => {
    const now = Date.now();
    const engine = new BridgeTimerEngine(
      makeBreakState({
        phase: "move",
        round: 2,
        isRunning: true,
        phaseStartedAt: now - 20_000, // 40s remain of 60s
        moveDuration: 60,
      }),
    );

    engine.adjustTime(30_000, true);

    const state = engine.getState();
    expect(state.moveDuration).toBe(90);
    expect(state.remainingMs).toBeNull();
    // 40s remaining + 30s = 70s against the new 90s duration.
    expect(engine.getRemainingMs(now)).toBe(70_000);
  });

  it("adjustTime grows a RUNNING break's duration and re-anchors it", () => {
    const now = Date.now();
    const engine = new BridgeTimerEngine(
      makeBreakState({
        phase: "break",
        round: 2,
        isRunning: true,
        phaseStartedAt: now - 100_000, // 200s remain of 300s
        breakDurationMs: 300_000,
      }),
    );

    engine.adjustTime(60_000);

    const state = engine.getState();
    expect(state.breakDurationMs).toBe(360_000);
    expect(state.remainingMs).toBeNull();
    // 200s remaining + 60s = 260s.
    expect(engine.getRemainingMs(now)).toBe(260_000);
  });

  it("previousPhase from finished preserves the running state (auto-start)", () => {
    const engine = new BridgeTimerEngine(
      makeBreakState({
        phase: "finished",
        round: 5,
        totalRounds: 5,
        isRunning: true,
      }),
    );

    engine.previousPhase();

    const state = engine.getState();
    expect(state.phase).toBe("play");
    expect(state.round).toBe(5);
    expect(state.isRunning).toBe(true);
  });

  it("previousPhase from a break steps back to the previous round's play (auto-start)", () => {
    const engine = new BridgeTimerEngine(
      makeBreakState({
        phase: "break",
        round: 3,
        breakDurationMs: 600_000,
        remainingMs: 600_000,
        isRunning: true,
      }),
    );

    engine.previousPhase();

    const state = engine.getState();
    expect(state.phase).toBe("play");
    expect(state.round).toBe(2);
    expect(state.isRunning).toBe(true);
  });

  it("previousPhase from a move at round 1 clamps the round to 1", () => {
    const engine = new BridgeTimerEngine(
      makeBreakState({ phase: "move", round: 1 }),
    );

    engine.previousPhase();

    // Math.max(1, round - 1) keeps it at round 1.
    expect(engine.getState().round).toBe(1);
    expect(engine.getState().phase).toBe("play");
  });

  it("previousPhase from play into a preceding break preserves running state", () => {
    const engine = new BridgeTimerEngine(
      makeBreakState({
        phase: "play",
        round: 3,
        isRunning: true,
        phaseStartedAt: Date.now(),
        breaks: [durationBreak(2, 8)],
      }),
    );

    engine.previousPhase();

    const state = engine.getState();
    expect(state.phase).toBe("break");
    expect(state.breakDurationMs).toBe(480_000);
    expect(state.isRunning).toBe(true);
  });

  it("updateConfig recomputes a paused MOVE phase against the new move duration", () => {
    const engine = new BridgeTimerEngine(
      makeBreakState({
        phase: "move",
        round: 2,
        remainingMs: 30_000, // 30s remain of 60s -> 30s elapsed
        moveDuration: 60,
      }),
    );

    // New move duration 90s; elapsed 30s -> remaining 60s.
    engine.updateConfig(3, 5, 420, 90);

    expect(engine.getState().remainingMs).toBe(60_000);
    expect(engine.getState().moveDuration).toBe(90);
  });

  it("updateConfig recomputes a RUNNING move phase, re-anchoring phaseStartedAt", () => {
    const now = Date.now();
    const engine = new BridgeTimerEngine(
      makeBreakState({
        phase: "move",
        round: 2,
        isRunning: true,
        phaseStartedAt: now - 20_000, // 20s elapsed
        moveDuration: 60,
      }),
    );

    // New move duration 90s; elapsed 20s -> remaining 70s.
    engine.updateConfig(3, 5, 420, 90);

    expect(engine.getRemainingMs(now)).toBe(70_000);
    expect(engine.getState().moveDuration).toBe(90);
  });

  it("updateConfig keeps existing durations when play/move durations are null", () => {
    const engine = new BridgeTimerEngine(
      makeBreakState({
        phase: "play",
        remainingMs: 300_000,
        playDuration: 420,
        moveDuration: 60,
      }),
    );

    // Pass null durations -> `?? this.state.*Duration` fallbacks and the
    // `!= null` guards both take their false branch (durations unchanged).
    engine.updateConfig(
      3,
      5,
      null as unknown as number,
      null as unknown as number,
    );

    const state = engine.getState();
    expect(state.playDuration).toBe(420);
    expect(state.moveDuration).toBe(60);
  });

  it("updateConfig on a break phase leaves the frozen break duration untouched", () => {
    const engine = new BridgeTimerEngine(
      makeBreakState({
        phase: "break",
        round: 2,
        breakDurationMs: 300_000,
        remainingMs: 300_000,
      }),
    );

    engine.updateConfig(3, 5, 480, 90);

    // Break duration is not recomputed by updateConfig.
    expect(engine.getState().breakDurationMs).toBe(300_000);
    expect(engine.getState().remainingMs).toBe(300_000);
    expect(engine.getState().playDuration).toBe(480);
  });
});

describe("BridgeTimerEngine - restartPhase / nextPhase edge branches", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("restartPhase does nothing when finished", () => {
    const engine = new BridgeTimerEngine(
      makeBreakState({ phase: "finished", round: 5, totalRounds: 5 }),
    );
    engine.restartPhase();
    expect(engine.getState().phase).toBe("finished");
  });

  it("restartPhase recomputes a break phase's duration from its scheduled break", () => {
    const engine = new BridgeTimerEngine(
      makeBreakState({
        phase: "break",
        round: 2, // break follows round 1
        breakDurationMs: 100_000,
        remainingMs: 100_000,
        breaks: [durationBreak(1, 10)],
      }),
    );

    engine.restartPhase();

    const state = engine.getState();
    // Recomputed to the full 10-minute break.
    expect(state.breakDurationMs).toBe(600_000);
    expect(state.remainingMs).toBe(600_000);
  });

  it("restartPhase falls back to 0 for a break phase with no scheduled break", () => {
    const engine = new BridgeTimerEngine(
      makeBreakState({
        phase: "break",
        round: 2,
        breakDurationMs: 100_000,
        remainingMs: 100_000,
        breaks: [], // no break after round 1 -> gap is a move -> duration 0
      }),
    );

    engine.restartPhase();

    const state = engine.getState();
    expect(state.breakDurationMs).toBe(0);
    expect(state.remainingMs).toBe(0);
  });

  it("restartPhase restarts a MOVE phase to its full move duration", () => {
    const engine = new BridgeTimerEngine(
      makeBreakState({ phase: "move", round: 2, remainingMs: 10_000 }),
    );

    engine.restartPhase();

    expect(engine.getState().remainingMs).toBe(60_000);
  });

  it("nextPhase play->move auto-starts when running (no break scheduled)", () => {
    const engine = new BridgeTimerEngine(
      makeBreakState({
        phase: "play",
        round: 1,
        isRunning: true,
        phaseStartedAt: Date.now(),
        breaks: [],
      }),
    );

    engine.nextPhase();

    const state = engine.getState();
    expect(state.phase).toBe("move");
    expect(state.round).toBe(2);
    expect(state.isRunning).toBe(true);
  });

  it("adjustTime on a RUNNING break with no breakDurationMs treats it as 0", () => {
    const now = Date.now();
    const engine = new BridgeTimerEngine(
      makeBreakState({
        phase: "break",
        round: 2,
        isRunning: true,
        phaseStartedAt: now,
        breakDurationMs: null,
        remainingMs: null,
      }),
    );

    engine.adjustTime(60_000);

    // (breakDurationMs ?? 0) + 60_000 = 60_000.
    expect(engine.getState().breakDurationMs).toBe(60_000);
  });

  it("previousPhase from the first play while paused restarts without auto-starting", () => {
    const engine = new BridgeTimerEngine(
      makeBreakState({ phase: "play", round: 1, isRunning: false }),
    );

    engine.previousPhase();

    const state = engine.getState();
    expect(state.round).toBe(1);
    expect(state.phase).toBe("play");
    expect(state.isRunning).toBe(false);
  });

  it("updateConfig on a MOVE phase keeps the move duration when null is passed", () => {
    const engine = new BridgeTimerEngine(
      makeBreakState({
        phase: "move",
        round: 2,
        remainingMs: 30_000,
        moveDuration: 60,
      }),
    );

    // moveDuration null -> newDuration uses `?? this.state.moveDuration` (60).
    engine.updateConfig(
      3,
      5,
      420,
      null as unknown as number,
    );

    // Elapsed 30s against unchanged 60s duration -> remaining stays 30s.
    expect(engine.getState().remainingMs).toBe(30_000);
    expect(engine.getState().moveDuration).toBe(60);
  });
});
