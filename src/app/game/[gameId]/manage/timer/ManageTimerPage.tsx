"use client";

import { useGame } from "@/context/GameContext";
import { useTimerSync } from "@/hooks/timer-sync";
import {useEffect, useMemo, useState } from "react";
import {TimerControlsView, TimerStatus } from "./TimerControlsView";
import { useTimerDerived } from "@/hooks/timer-derived";
import { getSocket } from "@/lib/socket";
import { getDirectorToken } from "@/lib/director-token";
import { SocketEvents } from "@/socket/socket-events";



export default function ManageTimerPage() {
  const { game } = useGame();
  const { timerState } = useTimerSync();

  // eslint-disable-next-line react-compiler/react-compiler
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
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

  // eslint-disable-next-line react-compiler/react-compiler
  const previewEndDate = useMemo(
    () => new Date(Date.now() + totalSessionSeconds * 1000),
    [totalSessionSeconds],
  );

  if (!game) return null;

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
      gameType: game!.gameType,
      gameId: game!.gameId,
      directorToken: getDirectorToken(game!.gameId),
    });
  }

  function emitConfig(event: string) {
    getSocket().emit(event, {
      gameType: game!.gameType,
      gameId: game!.gameId,
      directorToken: getDirectorToken(game!.gameId),
      boardsPerRound,
      totalRounds,
      playDuration: effectivePlayDuration,
      moveDuration,
    });
  }

  return (
    <TimerControlsView
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
