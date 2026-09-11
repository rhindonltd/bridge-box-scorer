import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useTimerConfigState, msToResumeAt } from "./useTimerConfigState";
import type { TimerState } from "@/timer/timer-state";

function seedState(overrides: Partial<TimerState> = {}): TimerState {
  return {
    version: 1,
    phase: null,
    board: 1,
    round: 1,
    boardsPerRound: 4,
    totalRounds: 9,
    playDuration: 150,
    moveDuration: 90,
    breaks: [],
    warningSeconds: 60,
    isRunning: false,
    phaseStartedAt: null,
    remainingMs: null,
    breakDurationMs: null,
    ...overrides,
  };
}

describe("useTimerConfigState", () => {
  describe("without derived values (editable structure)", () => {
    it("seeds boards/round and total rounds from the persisted state", () => {
      const { result } = renderHook(() => useTimerConfigState(seedState()));

      expect(result.current.config.boardsPerRound).toBe(4);
      expect(result.current.config.totalRounds).toBe(9);
      expect(result.current.structureLocked).toBe(false);
    });

    it("lets the two structure fields be edited", () => {
      const { result } = renderHook(() => useTimerConfigState(seedState()));

      act(() => result.current.configHandlers.onConfigChange("totalRounds", 12));
      act(() =>
        result.current.configHandlers.onConfigChange("boardsPerRound", 2),
      );

      expect(result.current.config.totalRounds).toBe(12);
      expect(result.current.config.boardsPerRound).toBe(2);
      expect(result.current.emitConfigFields.totalRounds).toBe(12);
      expect(result.current.emitConfigFields.boardsPerRound).toBe(2);
    });
  });

  describe("with derived values (locked structure)", () => {
    it("uses the derived values and reports the structure as locked", () => {
      const { result } = renderHook(() =>
        useTimerConfigState(seedState(), { boardsPerRound: 3, totalRounds: 7 }),
      );

      expect(result.current.config.boardsPerRound).toBe(3);
      expect(result.current.config.totalRounds).toBe(7);
      expect(result.current.structureLocked).toBe(true);
      // Derived wins over the seeded persisted values.
      expect(result.current.emitConfigFields.boardsPerRound).toBe(3);
      expect(result.current.emitConfigFields.totalRounds).toBe(7);
    });

    it("ignores edits to the locked structure fields", () => {
      const { result } = renderHook(() =>
        useTimerConfigState(seedState(), { boardsPerRound: 3, totalRounds: 7 }),
      );

      act(() =>
        result.current.configHandlers.onConfigChange("totalRounds", 99),
      );
      act(() =>
        result.current.configHandlers.onConfigChange("boardsPerRound", 99),
      );

      expect(result.current.config.totalRounds).toBe(7);
      expect(result.current.config.boardsPerRound).toBe(3);
    });

    it("still allows editing durations while the structure is locked", () => {
      const { result } = renderHook(() =>
        useTimerConfigState(seedState(), { boardsPerRound: 3, totalRounds: 7 }),
      );

      act(() => result.current.configHandlers.onConfigChange("playMinutes", 3));

      expect(result.current.config.playMinutes).toBe(3);
    });

    it("tracks a change in the derived values (e.g. movement changed)", () => {
      const { result, rerender } = renderHook(
        ({ d }) => useTimerConfigState(seedState(), d),
        { initialProps: { d: { boardsPerRound: 3, totalRounds: 7 } } },
      );

      expect(result.current.config.totalRounds).toBe(7);

      rerender({ d: { boardsPerRound: 2, totalRounds: 10 } });

      expect(result.current.config.totalRounds).toBe(10);
      expect(result.current.config.boardsPerRound).toBe(2);
    });
  });

  describe("resume-time auto-fill", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    // Pin the clock so the hook's `tick` (seeded via a 0ms timer) is a known
    // value, making the derived earliest resume time deterministic.
    function renderAtFixedTime(state: TimerState) {
      const now = new Date("2025-01-01T10:00:00").getTime();
      vi.useFakeTimers();
      vi.setSystemTime(now);
      const hook = renderHook(() => useTimerConfigState(state));
      // Flush the tick-seed timer so `tick === now`.
      act(() => {
        vi.advanceTimersByTime(1);
      });
      return { ...hook, now };
    }

    it("fills the earliest legal time when switching a break to Resume at time", () => {
      // 4 rounds, 150s play, 90s move, no breaks yet.
      const { result, now } = renderAtFixedTime(
        seedState({ totalRounds: 4, playDuration: 150, moveDuration: 90, breaks: [] }),
      );

      act(() => result.current.configHandlers.onAddBreak());
      // The added break defaults to afterRound 1. Play for round 1 ends at
      // now + 150s, which is the earliest it can resume.
      act(() =>
        result.current.configHandlers.onBreakChange(0, "afterRound", 2),
      );
      act(() =>
        result.current.configHandlers.onBreakChange(0, "mode", "resumeTime"),
      );

      // After round 2: round1 play (150) + move (90) + round2 play (150) = 390s.
      const earliest = msToResumeAt(now + 390 * 1000);
      expect(result.current.config.breaks[0].resumeAt).toBe(earliest);
      expect(earliest).toBe("10:06"); // 10:00 + 6m30s -> 10:06 (HH:MM).
    });

    it("snaps an illegal (too-early) time up to the earliest when the round changes", () => {
      const { result, now } = renderAtFixedTime(
        seedState({ totalRounds: 4, playDuration: 150, moveDuration: 90, breaks: [] }),
      );

      act(() => result.current.configHandlers.onAddBreak());
      act(() =>
        result.current.configHandlers.onBreakChange(0, "mode", "resumeTime"),
      );
      // Force an obviously-too-early time, then move the break later.
      act(() =>
        result.current.configHandlers.onBreakChange(0, "resumeAt", "09:00"),
      );
      act(() =>
        result.current.configHandlers.onBreakChange(0, "afterRound", 3),
      );

      // After round 3: 3 plays (450) + 2 moves (180) = 630s from now.
      const earliest = msToResumeAt(now + 630 * 1000);
      expect(result.current.config.breaks[0].resumeAt).toBe(earliest);
    });

    it("keeps a legal resume time as the director set it", () => {
      const { result } = renderAtFixedTime(
        seedState({ totalRounds: 4, playDuration: 150, moveDuration: 90, breaks: [] }),
      );

      act(() => result.current.configHandlers.onAddBreak());
      act(() =>
        result.current.configHandlers.onBreakChange(0, "afterRound", 2),
      );
      act(() =>
        result.current.configHandlers.onBreakChange(0, "mode", "resumeTime"),
      );
      // A later, clearly-legal time should be preserved on a subsequent
      // afterRound edit that keeps it legal.
      act(() =>
        result.current.configHandlers.onBreakChange(0, "resumeAt", "12:00"),
      );
      act(() =>
        result.current.configHandlers.onBreakChange(0, "afterRound", 2),
      );

      expect(result.current.config.breaks[0].resumeAt).toBe("12:00");
    });
  });

  describe("session length", () => {
    // On first render the hook's internal `tick` is 0 (the Date.now() seed runs
    // in an effect after render), so the derived session length reflects only
    // the configured durations and is independent of the wall clock.

    it("sums play and move time when there are no breaks", () => {
      // 4 rounds, 150s play, 90s move: 4*150 + 3*90 = 870s = 14m 30s.
      const { result } = renderHook(() =>
        useTimerConfigState(seedState({ totalRounds: 4, breaks: [] })),
      );

      expect(result.current.sessionLength).toBe("14m 30s");
    });

    it("includes a fixed-duration break in the session length", () => {
      // Same 4 rounds, but a 10-minute break replaces the move after round 2:
      // 4*150 + 2*90 (moves after rounds 1 and 3) + 600 (break) = 1380s.
      const { result } = renderHook(() =>
        useTimerConfigState(
          seedState({
            totalRounds: 4,
            breaks: [
              { afterRound: 2, mode: "duration", durationSeconds: 600 },
            ],
          }),
        ),
      );

      // 1380s = 23m 0s.
      expect(result.current.sessionLength).toBe("23m 0s");
    });

    it("adds break time on top of the play+move baseline", () => {
      const base = renderHook(() =>
        useTimerConfigState(seedState({ totalRounds: 4, breaks: [] })),
      ).result.current.sessionLength;
      const withBreak = renderHook(() =>
        useTimerConfigState(
          seedState({
            totalRounds: 4,
            breaks: [
              { afterRound: 2, mode: "duration", durationSeconds: 600 },
            ],
          }),
        ),
      ).result.current.sessionLength;

      // Baseline is 14m 30s; the 10-minute break lengthens the session, but a
      // break replaces one 90s move, so the net add is 600 - 90 = 510s.
      expect(base).toBe("14m 30s");
      expect(withBreak).toBe("23m 0s");
    });
  });
});
