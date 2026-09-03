"use client";

import { useRequiredGame } from "@/context/GameContext";
import { useTimerSync } from "@/hooks/timer-sync";
import { useEffect, useMemo, useState } from "react";
import { TimerControlsView, TimerStatus } from "./TimerControlsView";
import { useTimerDerived } from "@/hooks/timer-derived";
import { getSocket } from "@/lib/socket";
import { getDirectorToken } from "@/lib/director-token";
import { SocketEvents } from "@/socket/socket-events";

interface Props {
  /**
   * When true, render the timer controls without the outer GamePageLayout so
   * they can be embedded beneath the setup flow's tab bar. Defaults to false
   * (standalone page, used by the manage/timer route).
   */
  embedded?: boolean;
}

/**
 * Stateful timer configuration + controls. Holds the config state, derived
 * preview values, live timer sync, and the socket emitters, and renders the
 * presentational TimerControlsView. Shared between the manage/timer route
 * (standalone) and the game setup flow's Timer tab (embedded).
 */
export function TimerSetup({ embedded = false }: Props) {
  const { game } = useRequiredGame();
  const { timerState } = useTimerSync();

  // `tick` is the current wall-clock time in ms, refreshed every second so
  // time-derived values recompute. It starts at 0 and is populated by the
  // effect below, keeping the impure Date.now() call out of render.
  const [tick, setTick] = useState(0);

  useEffect(() => {
    // Seed immediately via a 0ms timer (a callback, not a synchronous
    // in-effect setState) then refresh every second.
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

  const enteredPlaySeconds = playMinutes * 60 + playSeconds;
  const moveDuration = moveMinutes * 60 + moveSeconds;

  const effectivePlayDuration =
    timingMode === "perRound"
      ? enteredPlaySeconds
      : enteredPlaySeconds * boardsPerRound;

  const totalSessionSeconds =
    totalRounds * effectivePlayDuration +
    Math.max(0, totalRounds - 1) * moveDuration;

  // Derived from `tick` (current time) rather than Date.now() so it stays pure
  // during render and refreshes with the per-second tick.
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
    });
  }

  return (
    <TimerControlsView
      embedded={embedded}
      hasSession={hasSession}
      timer={hasSession ? timer : null}
      config={{
        boardsPerRound,
        totalRounds,
        playMinutes,
        playSeconds,
        moveMinutes,
        moveSeconds,
        timingMode,
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
        }
      }}
      onCreate={() => emitConfig(SocketEvents.CREATE_TIMER)}
      onApplyChanges={() => emitConfig(SocketEvents.UPDATE_CONFIG_TIMER)}
      onStart={() => emitSimple(SocketEvents.START_TIMER)}
      onPause={() => emitSimple(SocketEvents.PAUSE_TIMER)}
    />
  );
}
