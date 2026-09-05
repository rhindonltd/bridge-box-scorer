"use client";

import { useRequiredGame } from "@/context/GameContext";
import { TimerProvider, useTimerContext } from "@/context/TimerContext";
import { useEffect, useState } from "react";
import { TimerConfigView } from "./TimerConfigView";
import { TimerLiveView } from "./TimerLiveView";
import { TimerStatus } from "./timer-view-types";
import { useTimerConfigState } from "./useTimerConfigState";
import { useTimerDerived } from "@/hooks/timer-derived";
import { getSocket } from "@/lib/socket";
import { getDirectorToken } from "@/lib/director-token";
import { SocketEvents } from "@/socket/socket-events";

// Re-exported for existing consumers/tests; the implementations now live with
// the shared config-state hook.
export { resumeAtToMs, msToLabel } from "./useTimerConfigState";

/**
 * Timer configuration container (setup / not-yet-started). Owns the editable
 * config and emits `timer:saveConfig` on save. Renders no run controls: the
 * timer only begins when the game is started.
 */
function TimerConfigContainer({ embedded = false }: { embedded?: boolean }) {
  const { game } = useRequiredGame();
  const { timerState, breakProblems } = useTimerContext();

  const {
    config,
    configHandlers,
    emitConfigFields,
    sessionLength,
    previewEnd,
  } = useTimerConfigState(timerState);

  function onSave() {
    getSocket().emit(SocketEvents.SAVE_CONFIG_TIMER, {
      gameType: game.gameType,
      gameId: game.gameId,
      directorToken: getDirectorToken(game.gameId),
      ...emitConfigFields,
    });
  }

  return (
    <TimerConfigView
      embedded={embedded}
      config={config}
      breakProblems={breakProblems}
      sessionLength={sessionLength}
      previewEnd={previewEnd}
      onSave={onSave}
      {...configHandlers}
    />
  );
}

/**
 * Live timer container (game in progress). Owns the editable config for "Apply
 * Changes" and wires the run controls to the timer control events.
 */
function TimerLiveContainer() {
  const { game } = useRequiredGame();
  const { timerState, breakProblems } = useTimerContext();

  const [tick, setTick] = useState(0);
  // A 1s tick keeps the derived status counting down between syncs.
  useTicker(setTick);

  const timer = useTimerDerived(timerState, tick) as TimerStatus;

  const {
    config,
    configHandlers,
    emitConfigFields,
    adjustApplyToFuture,
    setAdjustApplyToFuture,
  } = useTimerConfigState(timerState);

  function emitSimple(event: string) {
    getSocket().emit(event, {
      gameType: game.gameType,
      gameId: game.gameId,
      directorToken: getDirectorToken(game.gameId),
    });
  }

  function onApplyChanges() {
    getSocket().emit(SocketEvents.UPDATE_CONFIG_TIMER, {
      gameType: game.gameType,
      gameId: game.gameId,
      directorToken: getDirectorToken(game.gameId),
      ...emitConfigFields,
    });
  }

  function onAdjustTime(deltaSeconds: number) {
    getSocket().emit(SocketEvents.ADJUST_TIME_TIMER, {
      gameType: game.gameType,
      gameId: game.gameId,
      directorToken: getDirectorToken(game.gameId),
      deltaSeconds,
      applyToFutureSameType: adjustApplyToFuture,
    });
  }

  return (
    <TimerLiveView
      timer={timer}
      config={config}
      breakProblems={breakProblems}
      onApplyChanges={onApplyChanges}
      onStart={() => emitSimple(SocketEvents.START_TIMER)}
      onPause={() => emitSimple(SocketEvents.PAUSE_TIMER)}
      onNext={() => emitSimple(SocketEvents.NEXT_ROUND_TIMER)}
      onPrevious={() => emitSimple(SocketEvents.PREVIOUS_TIMER)}
      onAdjustTime={onAdjustTime}
      adjustApplyToFuture={adjustApplyToFuture}
      onAdjustApplyToFutureChange={setAdjustApplyToFuture}
      {...configHandlers}
    />
  );
}

/** Drive a 1-second tick to keep the live status counting down. */
function useTicker(setTick: (t: number) => void) {
  useEffect(() => {
    const seed = setTimeout(() => setTick(Date.now()), 0);
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => {
      clearTimeout(seed);
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Timer setup entry point for the game-creation flow's Timer tab. Always
 * renders the configuration screen (config-only): the timer cannot be started
 * from setup, only configured.
 */
export function TimerSetup({ embedded = false }: { embedded?: boolean }) {
  return (
    <TimerProvider>
      <TimerConfigContainer embedded={embedded} />
    </TimerProvider>
  );
}

/**
 * Timer management for the standalone /manage/timer route. Shows the live
 * control screen when the game is in progress, and the configuration screen
 * before it has started. Wrapped in a TimerProvider so timer state is loaded on
 * mount and kept live.
 */
export function TimerManager({ started }: { started: boolean }) {
  return (
    <TimerProvider>
      {started ? <TimerLiveContainer /> : <TimerConfigContainer />}
    </TimerProvider>
  );
}
