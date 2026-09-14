import { BreakConfig } from "@/timer/timer-state";
import { BreakDraft } from "./timer-view-types";

/**
 * Pure time/formatting utilities for the timer configuration surface. Extracted
 * from the `useTimerConfigState` hook so the (framework-free) computations can
 * be tested and reused without pulling in React.
 */

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

/** Format a duration in ms as a coarse "Hh Mm" / "Mm" label (rounded to minutes). */
export function msToLabel(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes <= 0) return "0m";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Format a ms-since-epoch timestamp as the local "HH:MM" a time input wants. */
export function msToResumeAt(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Format a whole-second duration for the session-length readout. Unlike
 * {@link msToLabel} this keeps seconds precision for sub-hour durations
 * ("Mm Ss" / "Ss"), which the session preview wants.
 */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/**
 * Walk the session timeline from `start`, returning the ms-since-epoch at which
 * each round's play finishes (keyed by round number).
 *
 * Between rounds the cursor advances by either a configured break (a fixed
 * duration, or the gap up to its resume time) or, when no break sits there, the
 * move time. This is the single source of truth for the per-round timeline and
 * the session end; the earliest legal resume time for a break after round N is
 * simply the play-end of round N.
 */
export function computePlayEndByRound(params: {
  start: number;
  totalRounds: number;
  playMs: number;
  moveMs: number;
  breaks: BreakConfig[];
}): Map<number, number> {
  const { start, totalRounds, playMs, moveMs, breaks } = params;
  const map = new Map<number, number>();
  let cursor = start;
  for (let round = 1; round <= totalRounds; round++) {
    cursor += playMs;
    map.set(round, cursor);
    if (round < totalRounds) {
      const brk = breaks.find((b) => b.afterRound === round);
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
}

/** Convert a persisted break config into an editable draft. */
export function breakConfigToDraft(b: BreakConfig): BreakDraft {
  if (b.mode === "duration") {
    return {
      afterRound: b.afterRound,
      mode: "duration",
      durationMinutes: Math.round(b.durationSeconds / 60),
      resumeAt: "",
    };
  }
  return {
    afterRound: b.afterRound,
    mode: "resumeTime",
    durationMinutes: 0,
    resumeAt: msToResumeAt(b.resumeAtMs),
  };
}
