import { describe, it, expect } from "vitest";
import { useTimerDerived } from "./timer-derived";
import type { TimerState } from "@/timer/timer-state";

function makeState(overrides: Partial<TimerState> = {}): TimerState {
  return {
    version: 1,
    phase: "play",
    board: 2,
    round: 3,
    boardsPerRound: 4,
    totalRounds: 7,
    playDuration: 420,
    moveDuration: 60,
    isRunning: false,
    phaseStartedAt: null,
    remainingMs: null,
    ...overrides,
  };
}

describe("useTimerDerived", () => {
  it("returns defaults when state is null", () => {
    const result = useTimerDerived(null, Date.now());
    expect(result.remaining).toBe(0);
    expect(result.phase).toBeNull();
    expect(result.round).toBeNull();
    expect(result.boardLabel).toBeNull();
    expect(result.title).toBe("Connecting…");
    expect(result.isRunning).toBe(false);
  });

  it("returns full play duration when not running and no remainingMs", () => {
    const state = makeState();
    const result = useTimerDerived(state, Date.now());
    expect(result.remaining).toBe(420);
  });

  it("returns remaining seconds from remainingMs when paused", () => {
    const state = makeState({ remainingMs: 150_000 });
    const result = useTimerDerived(state, Date.now());
    expect(result.remaining).toBe(150); // ceil(150000/1000)
  });

  it("computes remaining from elapsed time when running", () => {
    const now = 1000000;
    const state = makeState({
      isRunning: true,
      phaseStartedAt: now - 60_000,
      playDuration: 420,
    });
    const result = useTimerDerived(state, now);
    expect(result.remaining).toBe(360); // 420 - 60
  });

  it("never returns negative remaining", () => {
    const now = 1000000;
    const state = makeState({
      isRunning: true,
      phaseStartedAt: now - 500_000,
      playDuration: 420,
    });
    const result = useTimerDerived(state, now);
    expect(result.remaining).toBe(0);
  });

  it("uses moveDuration in move phase", () => {
    const state = makeState({ phase: "move", moveDuration: 60 });
    const result = useTimerDerived(state, Date.now());
    expect(result.remaining).toBe(60);
  });

  it("returns 0 remaining in finished phase", () => {
    const state = makeState({ phase: "finished" });
    const result = useTimerDerived(state, Date.now());
    expect(result.remaining).toBe(0);
  });

  describe("title", () => {
    it("shows round info during play", () => {
      const state = makeState({ phase: "play", round: 3, totalRounds: 7 });
      const result = useTimerDerived(state, Date.now());
      expect(result.title).toBe("Round 3 of 7");
    });

    it("shows move info during move", () => {
      const state = makeState({ phase: "move", round: 3 });
      const result = useTimerDerived(state, Date.now());
      expect(result.title).toBe("Move for Round 3");
    });

    it("shows session complete when finished", () => {
      const state = makeState({ phase: "finished" });
      const result = useTimerDerived(state, Date.now());
      expect(result.title).toBe("Session Complete");
    });
  });

  describe("boardLabel", () => {
    it("shows board info during play phase", () => {
      const state = makeState({
        phase: "play",
        board: 2,
        boardsPerRound: 4,
      });
      const result = useTimerDerived(state, Date.now());
      expect(result.boardLabel).toBe("Board 2 of 4");
    });

    it("is null during move phase", () => {
      const state = makeState({ phase: "move" });
      const result = useTimerDerived(state, Date.now());
      expect(result.boardLabel).toBeNull();
    });
  });

  describe("projectedEndDate", () => {
    it("projects end time based on remaining session time", () => {
      const now = 1_700_000_000_000;
      const state = makeState({
        phase: "play",
        round: 1,
        totalRounds: 2,
        playDuration: 420,
        moveDuration: 60,
        isRunning: false,
      });
      const result = useTimerDerived(state, now);
      // remaining: full play (420s) + 1 future round of play (420s) + 1 move (60s)
      // = 420000 + 420000 + 60000 = 900000ms
      expect(result.projectedEndDate.getTime()).toBeGreaterThan(now);
    });
  });
});


describe("useTimerDerived - breaks and warning", () => {
  it("returns the configured warning threshold", () => {
    const state = makeState({ warningSeconds: 30 });
    expect(useTimerDerived(state, Date.now()).warningSeconds).toBe(30);
  });

  it("defaults the warning threshold to 60 when absent", () => {
    const state = makeState({ warningSeconds: undefined });
    expect(useTimerDerived(state, Date.now()).warningSeconds).toBe(60);
  });

  it("shows Break title and break remaining in a break phase", () => {
    const state = makeState({
      phase: "break",
      round: 2,
      breakDurationMs: 300_000,
      remainingMs: 300_000,
      isRunning: false,
    });
    const result = useTimerDerived(state, Date.now());
    expect(result.title).toBe("Break");
    expect(result.remaining).toBe(300);
    expect(result.boardLabel).toBeNull();
  });

  it("includes break time in the projected session end", () => {
    const now = 1_700_000_000_000;
    const withoutBreak = makeState({
      phase: "play",
      round: 1,
      totalRounds: 2,
      playDuration: 420,
      moveDuration: 60,
      breaks: [],
      isRunning: false,
    });
    const withBreak = makeState({
      phase: "play",
      round: 1,
      totalRounds: 2,
      playDuration: 420,
      moveDuration: 60,
      // 10 min break after round 1 replaces the 60s move (net +540s).
      breaks: [{ afterRound: 1, mode: "duration", durationSeconds: 600 }],
      isRunning: false,
    });

    const endNoBreak = useTimerDerived(
      withoutBreak,
      now,
    ).projectedEndDate.getTime();
    const endWithBreak = useTimerDerived(
      withBreak,
      now,
    ).projectedEndDate.getTime();

    // Break (600s) replaces move (60s): projected end pushed out by 540s.
    expect(endWithBreak - endNoBreak).toBe(540_000);
  });
});
