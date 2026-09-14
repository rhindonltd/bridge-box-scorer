"use client";

import { useCallback, useMemo, useState } from "react";
import { BreakConfig } from "@/timer/timer-state";
import { BreakDraft } from "./timer-view-types";
import {
  breakConfigToDraft,
  computePlayEndByRound,
  msToLabel,
  msToResumeAt,
  resumeAtToMs,
} from "./timer-format";

/** The session-timeline inputs the break editor needs to place breaks. */
export interface BreakTimeline {
  /** Current wall-clock reference (the 1s tick), ms since epoch. */
  tick: number;
  totalRounds: number;
  /** Effective per-round play duration, seconds. */
  effectivePlayDuration: number;
  /** Move (changeover) duration, seconds. */
  moveDuration: number;
}

/**
 * Owns the editable list of session breaks and the operations on it (add,
 * remove, change), plus the derived {@link BreakConfig}s and the resume-time
 * legality logic. Extracted from `useTimerConfigState` so that hook is left
 * with durations/timing-mode/preview while this owns the self-contained break
 * sub-concern. The parent supplies the live {@link BreakTimeline}; this returns
 * the drafts, their domain configs, and a helper to annotate them with computed
 * lengths once the parent has walked the full timeline.
 */
export function useBreakEditor(timeline: BreakTimeline) {
  const { tick, totalRounds, effectivePlayDuration, moveDuration } = timeline;

  const [breaks, setBreaks] = useState<BreakDraft[]>([]);

  /** Replace all breaks (used by the parent's one-shot seed). */
  const seedBreaks = useCallback((configs: BreakConfig[]) => {
    setBreaks(configs.map(breakConfigToDraft));
  }, []);

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

  /**
   * Earliest legal resume time for a break placed after `afterRound`, as an
   * "HH:MM" string — when round `afterRound`'s play finishes. The timeline is
   * computed from the *other* breaks (the one being edited is excluded) so its
   * own resume time doesn't feed back into its own earliest bound.
   */
  const earliestResumeAt = useCallback(
    (afterRound: number, otherBreaks: BreakConfig[]): string => {
      const ends = computePlayEndByRound({
        start: tick,
        totalRounds,
        playMs: effectivePlayDuration * 1000,
        moveMs: moveDuration * 1000,
        breaks: otherBreaks,
      });
      const endMs = ends.get(afterRound) ?? tick;
      return msToResumeAt(endMs);
    },
    [tick, totalRounds, effectivePlayDuration, moveDuration],
  );

  const onAddBreak = useCallback(() => {
    setBreaks((prev) => [
      ...prev,
      {
        afterRound: Math.min(totalRounds - 1 || 1, prev.length + 1),
        mode: "duration",
        durationMinutes: 10,
        resumeAt: "",
      },
    ]);
  }, [totalRounds]);

  const onRemoveBreak = useCallback((index: number) => {
    setBreaks((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const onBreakChange = useCallback(
    (index: number, field: keyof BreakDraft, value: number | string) => {
      setBreaks((prev) =>
        prev.map((b, i) => {
          if (i !== index) return b;

          const updated = { ...b, [field]: value } as BreakDraft;

          // When the break is (or becomes) a resume-time break, ensure it has a
          // legal time. On selecting "Resume at time", or moving the break to a
          // different round, an empty or now-too-early time is snapped to the
          // earliest possible moment for the updated round.
          const becomesResume = field === "mode" && value === "resumeTime";
          const roundChangedWhileResume =
            field === "afterRound" && updated.mode === "resumeTime";

          if (becomesResume || roundChangedWhileResume) {
            const otherBreaks = breakConfigs.filter((_, j) => j !== index);
            const earliest = earliestResumeAt(updated.afterRound, otherBreaks);
            if (resumeIsIllegal(updated.resumeAt, earliest)) {
              updated.resumeAt = earliest;
            }
          }

          return updated;
        }),
      );
    },
    [breakConfigs, earliestResumeAt],
  );

  /**
   * Annotate the resume-time break drafts with their computed length, given the
   * per-round play-end timeline the parent has already walked (which includes
   * these breaks). Duration breaks carry a null computed length.
   */
  const withComputedLengths = useCallback(
    (playEndByRound: Map<number, number>): BreakDraft[] =>
      breaks.map((b) => {
        if (b.mode !== "resumeTime") {
          return { ...b, computedLength: null };
        }
        const priorPlayEnd = playEndByRound.get(b.afterRound) ?? tick;
        const resumeMs = resumeAtToMs(b.resumeAt, tick);
        return { ...b, computedLength: msToLabel(resumeMs - priorPlayEnd) };
      }),
    [breaks, tick],
  );

  /**
   * The stable, tick-independent shape of the breaks, for the parent's
   * auto-save signature (a resume-time break's derived `resumeAtMs` recomputes
   * every second and must not churn the signature).
   */
  const signatureParts = breaks.map((b) =>
    b.mode === "duration"
      ? { afterRound: b.afterRound, mode: b.mode, durationMinutes: b.durationMinutes }
      : { afterRound: b.afterRound, mode: b.mode, resumeAt: b.resumeAt },
  );

  return {
    breaks,
    breakConfigs,
    seedBreaks,
    onAddBreak,
    onRemoveBreak,
    onBreakChange,
    withComputedLengths,
    signatureParts,
  };
}

/**
 * True when a resume-time break's chosen time is missing or lands before the
 * earliest legal moment (i.e. before play for its round has finished).
 */
function resumeIsIllegal(chosen: string, earliest: string): boolean {
  if (!chosen) return true;
  // Compare as "HH:MM" within the same day; both are produced/normalised the
  // same way so lexical comparison is safe.
  return chosen < earliest;
}
