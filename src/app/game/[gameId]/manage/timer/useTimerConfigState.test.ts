import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useTimerConfigState } from "./useTimerConfigState";
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
});
