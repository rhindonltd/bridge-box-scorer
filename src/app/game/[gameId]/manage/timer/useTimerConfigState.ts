"use client";

import { useEffect, useMemo, useState } from "react";
import { BreakConfig, TimerState } from "@/timer/timer-state";
import { BreakDraft, TimerConfig } from "./timer-view-types";

/** Parse "HH:MM" against a reference date, returning ms since epoch. */
export function resumeAtToMs(resumeAt: string, reference: number): number {
  const [h, m] = resumeAt.split(":").map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return reference;
  const d = new Date(reference);
  d.setHours(h, m, 0, 0);
  // If the chosen time is earlier than the reference, assume it's later today
  // (breaks always resume after play, never the previous day).
  if (d.getTime() < reference) {
    d.setDate(d.getDate() + 1);
  }
  return d.getTime();
}

export function msToLabel(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes <= 0) return "0m";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/** Convert a persisted break config into an editable draft. */
function breakConfigToDraft(b: BreakConfig): BreakDraft {
  if (b.mode === "duration") {
    return {
      afterRound: b.afterRound,
      mode: "duration",
      durationMinutes: Math.round(b.durationSeconds / 60),
      resumeAt: "",
    };
  }
  const d = new Date(b.resumeAtMs);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return {
    afterRound: b.afterRound,
    mode: "resumeTime",
    durationMinutes: 0,
    resumeAt: `${hh}:${mm}`,
  };
}

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
export function useTimerConfigState(seedFrom?: TimerState | null) {
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
  const [playMinutes, setPlayMinutes] = useState(2);
  const [playSeconds, setPlaySeconds] = useState(0);
  const [moveMinutes, setMoveMinutes] = useState(1);
  const [moveSeconds, setMoveSeconds] = useState(30);
  const [timingMode, setTimingMode] = useState<"perRound" | "perBoard">(
    "perRound",
  );
  const [warningSeconds, setWarningSeconds] = useState(60);
  const [breaks, setBreaks] = useState<BreakDraft[]>([]);
  const [adjustApplyToFuture, setAdjustApplyToFuture] = useState(false);

  // One-shot seed from a persisted timer state (e.g. a saved config). Applied
  // during render the first time a state becomes available — the React-endorsed
  // "adjust state while rendering" pattern — so live edits afterwards are never
  // clobbered by subsequent syncs.
  const [seeded, setSeeded] = useState(false);
  if (!seeded && seedFrom) {
    setBoardsPerRound(seedFrom.boardsPerRound);
    setTotalRounds(seedFrom.totalRounds);
    // Durations are stored as total seconds; the form always presents play in
    // per-round terms.
    setPlayMinutes(Math.floor(seedFrom.playDuration / 60));
    setPlaySeconds(seedFrom.playDuration % 60);
    setMoveMinutes(Math.floor(seedFrom.moveDuration / 60));
    setMoveSeconds(seedFrom.moveDuration % 60);
    setTimingMode("perRound");
    if (seedFrom.warningSeconds != null) {
      setWarningSeconds(seedFrom.warningSeconds);
    }
    setBreaks((seedFrom.breaks ?? []).map(breakConfigToDraft));
    setSeeded(true);
  }

  const enteredPlaySeconds = playMinutes * 60 + playSeconds;
  const moveDuration = moveMinutes * 60 + moveSeconds;

  const effectivePlayDuration =
    timingMode === "perRound"
      ? enteredPlaySeconds
      : enteredPlaySeconds * boardsPerRound;

  const breakConfigs: BreakConfig[] = useMemo(() => {
    const reference = tick;
    return breaks.map((b) =>
      b.mode === "duration"
        ? {
            afterRound: b.afterRound,
            mode: "duration",
            durationSeconds: Math.max(0, Math.round(b.durationMinutes * 60)),
          }
        : {
            afterRound: b.afterRound,
            mode: "resumeTime",
            resumeAtMs: resumeAtToMs(b.resumeAt, reference),
          },
    );
  }, [breaks, tick]);

  const playEndByRound = useMemo(() => {
    const map = new Map<number, number>();
    const start = tick;
    const playMs = effectivePlayDuration * 1000;
    const moveMs = moveDuration * 1000;
    let cursor = start;
    for (let round = 1; round <= totalRounds; round++) {
      cursor += playMs;
      map.set(round, cursor);
      if (round < totalRounds) {
        const brk = breakConfigs.find((b) => b.afterRound === round);
        if (brk) {
          cursor +=
            brk.mode === "duration"
              ? brk.durationSeconds * 1000
              : Math.max(0, brk.resumeAtMs - cursor);
        } else {
          cursor += moveMs;
        }
      }
    }
    return map;
  }, [tick, effectivePlayDuration, moveDuration, totalRounds, breakConfigs]);

  const breaksWithComputed: BreakDraft[] = breaks.map((b) => {
    if (b.mode !== "resumeTime") {
      return { ...b, computedLength: null };
    }
    const reference = tick;
    const priorPlayEnd = playEndByRound.get(b.afterRound) ?? reference;
    const resumeMs = resumeAtToMs(b.resumeAt, reference);
    return { ...b, computedLength: msToLabel(resumeMs - priorPlayEnd) };
  });

  const totalSessionSeconds =
    totalRounds * effectivePlayDuration +
    Math.max(0, totalRounds - 1) * moveDuration;

  const previewEndDate = useMemo(
    () => new Date(tick + totalSessionSeconds * 1000),
    [tick, totalSessionSeconds],
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

  function onConfigChange(field: keyof TimerConfig, value: number | string) {
    switch (field) {
      case "boardsPerRound":
        setBoardsPerRound(value as number);
        break;
      case "totalRounds":
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

  function onAddBreak() {
    setBreaks((prev) => [
      ...prev,
      {
        afterRound: Math.min(totalRounds - 1 || 1, prev.length + 1),
        mode: "duration",
        durationMinutes: 10,
        resumeAt: "",
      },
    ]);
  }

  function onRemoveBreak(index: number) {
    setBreaks((prev) => prev.filter((_, i) => i !== index));
  }

  function onBreakChange(
    index: number,
    field: keyof BreakDraft,
    value: number | string,
  ) {
    setBreaks((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)),
    );
  }

  return {
    tick,
    config,
    configHandlers: { onConfigChange, onAddBreak, onRemoveBreak, onBreakChange },
    adjustApplyToFuture,
    setAdjustApplyToFuture,
    /** Domain payload fields for CREATE/SAVE/UPDATE config emits. */
    emitConfigFields: {
      boardsPerRound,
      totalRounds,
      playDuration: effectivePlayDuration,
      moveDuration,
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
