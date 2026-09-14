"use client";

import { useEffect, useMemo, useState } from "react";
import { TimerState } from "@/timer/timer-state";
import { TimerConfig } from "./timer-view-types";
import { computePlayEndByRound, formatDuration } from "./timer-format";
import { useBreakEditor } from "./useBreakEditor";

// Re-exported for existing consumers/tests that import these from the hook
// module. The implementations now live in the framework-free `timer-format`.
export {
  computePlayEndByRound,
  msToLabel,
  msToResumeAt,
  resumeAtToMs,
} from "./timer-format";

/**
 * Owns the editable timer configuration (durations, timing mode, breaks,
 * warning) plus the derived preview values and the domain payload used when
 * emitting to the server. Shared by the config and live containers so the
 * editing surface behaves identically in both.
 *
 * When `seedFrom` is provided (a persisted timer state), the form is seeded
 * from it once on first load. Seeding is intentionally one-shot so live edits
 * are never clobbered by subsequent state syncs.
 */
export function useTimerConfigState(
  seedFrom?: TimerState | null,
  /**
   * When provided, `boardsPerRound` and `totalRounds` are authoritative (they
   * come from the section's selected movement) and become read-only: they track
   * these values and `onConfigChange` ignores edits to them. Omit to keep both
   * fields editable (the live/adjust screen).
   */
  derived?: { boardsPerRound: number; totalRounds: number },
) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const seed = setTimeout(() => setTick(Date.now()), 0);
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => {
      clearTimeout(seed);
      clearInterval(id);
    };
  }, []);

  const [boardsPerRound, setBoardsPerRound] = useState(3);
  const [totalRounds, setTotalRounds] = useState(8);
  // Defaults for a fresh config (no persisted state yet): once a director
  // selects a movement, the timer starts out at 7:30 of play per board and a
  // 1:30 changeover, in Per Board timing mode. These are overridden by any
  // saved config via the one-shot seed below.
  const [playMinutes, setPlayMinutes] = useState(7);
  const [playSeconds, setPlaySeconds] = useState(30);
  const [moveMinutes, setMoveMinutes] = useState(1);
  const [moveSeconds, setMoveSeconds] = useState(30);
  const [timingMode, setTimingMode] = useState<"perRound" | "perBoard">(
    "perBoard",
  );
  const [warningSeconds, setWarningSeconds] = useState(60);
  const [adjustApplyToFuture, setAdjustApplyToFuture] = useState(false);

  const enteredPlaySeconds = playMinutes * 60 + playSeconds;
  const moveDuration = moveMinutes * 60 + moveSeconds;

  const effectivePlayDuration =
    timingMode === "perRound"
      ? enteredPlaySeconds
      : enteredPlaySeconds * boardsPerRound;

  // Breaks are a self-contained editing concern; the break editor owns the list
  // and its operations, driven by the live session timeline computed here.
  const breakEditor = useBreakEditor({
    tick,
    totalRounds,
    effectivePlayDuration,
    moveDuration,
  });
  const { breakConfigs } = breakEditor;

  // One-shot seed from a persisted timer state (e.g. a saved config). Applied
  // during render the first time a state becomes available — the React-endorsed
  // "adjust state while rendering" pattern — so live edits afterwards are never
  // clobbered by subsequent syncs.
  const [seeded, setSeeded] = useState(false);
  if (!seeded && seedFrom) {
    // When derived values are supplied they own the structure fields, so don't
    // seed those two from the persisted state (durations/breaks still seed).
    if (!derived) {
      setBoardsPerRound(seedFrom.boardsPerRound);
      setTotalRounds(seedFrom.totalRounds);
    }
    // Restore the timing mode the director chose (absent → per-round, for
    // states persisted before the mode was tracked).
    const seededMode = seedFrom.timingMode ?? "perRound";
    setTimingMode(seededMode);

    // `playDuration` is always the effective per-round total. The form presents
    // play per-board when the director chose that mode, so divide the stored
    // total back down by the section's boards-per-round to recover what they
    // originally entered. Derived boards-per-round (from the selected movement)
    // wins over any persisted value, so prefer it when reversing.
    const seededBoardsPerRound = derived?.boardsPerRound ?? seedFrom.boardsPerRound;
    const seededPlaySeconds =
      seededMode === "perBoard" && seededBoardsPerRound > 0
        ? Math.round(seedFrom.playDuration / seededBoardsPerRound)
        : seedFrom.playDuration;
    setPlayMinutes(Math.floor(seededPlaySeconds / 60));
    setPlaySeconds(seededPlaySeconds % 60);
    setMoveMinutes(Math.floor(seedFrom.moveDuration / 60));
    setMoveSeconds(seedFrom.moveDuration % 60);
    if (seedFrom.warningSeconds != null) {
      setWarningSeconds(seedFrom.warningSeconds);
    }
    breakEditor.seedBreaks(seedFrom.breaks ?? []);
    setSeeded(true);
  }

  // Derived structure values are authoritative: keep the two fields in sync
  // with the selected movement (adjusting during render if they diverge, e.g.
  // when the movement changes). This wins over any seeded value.
  if (derived && derived.boardsPerRound !== boardsPerRound) {
    setBoardsPerRound(derived.boardsPerRound);
  }
  if (derived && derived.totalRounds !== totalRounds) {
    setTotalRounds(derived.totalRounds);
  }

  const playEndByRound = useMemo(
    () =>
      computePlayEndByRound({
        start: tick,
        totalRounds,
        playMs: effectivePlayDuration * 1000,
        moveMs: moveDuration * 1000,
        breaks: breakConfigs,
      }),
    [tick, effectivePlayDuration, moveDuration, totalRounds, breakConfigs],
  );

  const breaksWithComputed = breakEditor.withComputedLengths(playEndByRound);

  // The session finishes at the end of the final round's play. `playEndByRound`
  // already walks the whole timeline from `tick`, inserting each configured
  // break (a fixed duration, or the gap up to a resume time) in place of the
  // move time between rounds — so its last entry is the true finish time,
  // breaks included. Deriving the length and preview end from it keeps them
  // consistent with the per-round timeline and, unlike the previous
  // play+move-only formula, no longer omits break time.
  const sessionEndMs = playEndByRound.get(totalRounds) ?? tick;
  const totalSessionSeconds = Math.max(
    0,
    Math.round((sessionEndMs - tick) / 1000),
  );

  const previewEndDate = useMemo(
    () => new Date(sessionEndMs),
    [sessionEndMs],
  );

  const config: TimerConfig = {
    boardsPerRound,
    totalRounds,
    playMinutes,
    playSeconds,
    moveMinutes,
    moveSeconds,
    timingMode,
    warningSeconds,
    breaks: breaksWithComputed,
  };

  // A stable signature of the user-controlled configuration, excluding any
  // tick-derived values (a resume-time break's `resumeAtMs`/`computedLength`
  // recompute every second and would otherwise cause spurious auto-saves).
  // Used by the config container to detect real edits worth persisting.
  const configSignature = JSON.stringify({
    boardsPerRound,
    totalRounds,
    playDuration: effectivePlayDuration,
    moveDuration,
    timingMode,
    warningSeconds,
    breaks: breakEditor.signatureParts,
  });

  function onConfigChange(field: keyof TimerConfig, value: number | string) {
    switch (field) {
      case "boardsPerRound":
        // Locked when derived from the selected movement.
        if (derived) break;
        setBoardsPerRound(value as number);
        break;
      case "totalRounds":
        // Locked when derived from the selected movement.
        if (derived) break;
        setTotalRounds(value as number);
        break;
      case "playMinutes":
        setPlayMinutes(value as number);
        break;
      case "playSeconds":
        setPlaySeconds(value as number);
        break;
      case "moveMinutes":
        setMoveMinutes(value as number);
        break;
      case "moveSeconds":
        setMoveSeconds(value as number);
        break;
      case "timingMode":
        setTimingMode(value as "perRound" | "perBoard");
        break;
      case "warningSeconds":
        setWarningSeconds(value as number);
        break;
    }
  }

  return {
    tick,
    config,
    configHandlers: {
      onConfigChange,
      onAddBreak: breakEditor.onAddBreak,
      onRemoveBreak: breakEditor.onRemoveBreak,
      onBreakChange: breakEditor.onBreakChange,
    },
    /** True when boards/round and total rounds are derived and read-only. */
    structureLocked: derived != null,
    /**
     * Stable JSON signature of the user-controlled config (no tick-derived
     * churn), for detecting edits that should be auto-saved.
     */
    configSignature,
    adjustApplyToFuture,
    setAdjustApplyToFuture,
    /** Domain payload fields for CREATE/SAVE/UPDATE config emits. */
    emitConfigFields: {
      boardsPerRound,
      totalRounds,
      playDuration: effectivePlayDuration,
      moveDuration,
      timingMode,
      warningSeconds,
      breaks: breakConfigs,
    },
    sessionLength: formatDuration(totalSessionSeconds),
    previewEnd: previewEndDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}
