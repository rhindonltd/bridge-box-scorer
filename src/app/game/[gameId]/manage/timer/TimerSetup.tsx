"use client";

import { useRequiredGame } from "@/context/GameContext";
import { useTimerSync } from "@/hooks/timer-sync";
import { useEffect, useMemo, useState } from "react";
import {
  TimerControlsView,
  TimerStatus,
  BreakDraft,
} from "./TimerControlsView";
import { useTimerDerived } from "@/hooks/timer-derived";
import { getSocket } from "@/lib/socket";
import { getDirectorToken } from "@/lib/director-token";
import { SocketEvents } from "@/socket/socket-events";
import { BreakConfig } from "@/timer/timer-state";

interface Props {
  embedded?: boolean;
}

/** Parse "HH:MM" against a reference date, returning ms since epoch. */
function resumeAtToMs(resumeAt: string, reference: number): number {
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

function msToLabel(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes <= 0) return "0m";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function TimerSetup({ embedded = false }: Props) {
  const { game } = useRequiredGame();
  const { timerState, breakProblems } = useTimerSync();

  const [tick, setTick] = useState(0);

  useEffect(() => {
    const seed = setTimeout(() => setTick(Date.now()), 0);
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => {
      clearTimeout(seed);
      clearInterval(id);
    };
  }, []);

  const timer: TimerStatus | null = useTimerDerived(timerState, tick);

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

  const enteredPlaySeconds = playMinutes * 60 + playSeconds;
  const moveDuration = moveMinutes * 60 + moveSeconds;

  const effectivePlayDuration =
    timingMode === "perRound"
      ? enteredPlaySeconds
      : enteredPlaySeconds * boardsPerRound;

  // Convert break drafts into domain BreakConfig for emitting. Resume-time
  // breaks are anchored against the current tick so "HH:MM" maps to an absolute
  // instant.
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

  // Compute a preview of projected play-end per round for the *unsaved* config
  // so resume-time break drafts can show their derived length. Session start is
  // assumed to be "now" (tick).
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
  }, [
    tick,
    effectivePlayDuration,
    moveDuration,
    totalRounds,
    breakConfigs,
  ]);

  // Enrich resume-time break drafts with a computed length label.
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

  function formatDuration(totalSeconds: number) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }

  const hasSession = !!timerState;

  function emitSimple(event: string) {
    getSocket().emit(event, {
      gameType: game.gameType,
      gameId: game.gameId,
      directorToken: getDirectorToken(game.gameId),
    });
  }

  function emitConfig(event: string) {
    getSocket().emit(event, {
      gameType: game.gameType,
      gameId: game.gameId,
      directorToken: getDirectorToken(game.gameId),
      boardsPerRound,
      totalRounds,
      playDuration: effectivePlayDuration,
      moveDuration,
      warningSeconds,
      breaks: breakConfigs,
    });
  }

  function emitAdjust(deltaSeconds: number) {
    getSocket().emit(SocketEvents.ADJUST_TIME_TIMER, {
      gameType: game.gameType,
      gameId: game.gameId,
      directorToken: getDirectorToken(game.gameId),
      deltaSeconds,
      applyToFutureSameType: adjustApplyToFuture,
    });
  }

  function emitPrevious() {
    getSocket().emit(SocketEvents.PREVIOUS_TIMER, {
      gameType: game.gameType,
      gameId: game.gameId,
      directorToken: getDirectorToken(game.gameId),
    });
  }

  function addBreak() {
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

  function removeBreak(index: number) {
    setBreaks((prev) => prev.filter((_, i) => i !== index));
  }

  function changeBreak(
    index: number,
    field: keyof BreakDraft,
    value: number | string,
  ) {
    setBreaks((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)),
    );
  }

  return (
    <TimerControlsView
      embedded={embedded}
      hasSession={hasSession}
      timer={hasSession ? timer : null}
      breakProblems={breakProblems}
      config={{
        boardsPerRound,
        totalRounds,
        playMinutes,
        playSeconds,
        moveMinutes,
        moveSeconds,
        timingMode,
        warningSeconds,
        breaks: breaksWithComputed,
      }}
      sessionLength={formatDuration(totalSessionSeconds)}
      previewEnd={previewEndDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}
      onConfigChange={(field, value) => {
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
      }}
      onAddBreak={addBreak}
      onRemoveBreak={removeBreak}
      onBreakChange={changeBreak}
      adjustApplyToFuture={adjustApplyToFuture}
      onAdjustApplyToFutureChange={setAdjustApplyToFuture}
      onCreate={() => emitConfig(SocketEvents.CREATE_TIMER)}
      onApplyChanges={() => emitConfig(SocketEvents.UPDATE_CONFIG_TIMER)}
      onStart={() => emitSimple(SocketEvents.START_TIMER)}
      onPause={() => emitSimple(SocketEvents.PAUSE_TIMER)}
      onNext={() => emitSimple(SocketEvents.NEXT_ROUND_TIMER)}
      onPrevious={emitPrevious}
      onAdjustTime={emitAdjust}
    />
  );
}
