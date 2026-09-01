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
