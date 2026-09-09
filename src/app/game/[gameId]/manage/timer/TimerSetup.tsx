"use client";

import { useRequiredGame } from "@/context/GameContext";
import { TimerProvider, useTimerContext } from "@/context/TimerContext";
import { useEffect, useState } from "react";
import { TimerConfigView } from "./TimerConfigView";
import { TimerLiveView } from "./TimerLiveView";
import { TimerStatus } from "./timer-view-types";
import { useTimerConfigState } from "./useTimerConfigState";
import { useTimerDerived } from "@/hooks/timer-derived";
import { useSections } from "@/hooks/sections";
import { useMovementRoundInfo } from "@/hooks/movement-round-info";
import { SectionPills } from "@/components/manage/sections/SectionPills";
import { useSetupSections } from "@/components/manage/sections/useSetupSections";
import { getSocket } from "@/lib/socket";
import { getDirectorToken } from "@/lib/director-token";
import { SocketEvents } from "@/socket/socket-events";

// Re-exported for existing consumers/tests; the implementations now live with
// the shared config-state hook.
export { resumeAtToMs, msToLabel } from "./useTimerConfigState";

/**
 * Timer configuration container for a single section (setup / not-yet-started).
 * Emits `timer:saveConfig` for its section on Save. Section navigation is
 * handled by the shared pills rendered above (passed in as `headerSlot`), so
 * the director configures each section directly rather than copying config
 * across them.
 */
function TimerConfigContainer({
  section,
  embedded = false,
  headerSlot,
}: {
  section: string;
  embedded?: boolean;
  headerSlot?: React.ReactNode;
}) {
  const { game } = useRequiredGame();
  const { timerState, breakProblems } = useTimerContext();

  // Rounds and boards-per-round are derived from this section's selected
  // movement rather than entered by hand. With no movement, the config is
  // disabled and the director is prompted to choose one first.
  const { sections } = useSections(game.gameId);
  const selectedMovement =
    sections.find((s) => s.section === section)?.selectedMovement ?? null;
  const { info: movementInfo } = useMovementRoundInfo(
    selectedMovement,
    game.gameType,
  );
  const derived = movementInfo
    ? {
        boardsPerRound: movementInfo.boardsPerRound,
        totalRounds: movementInfo.rounds,
      }
    : undefined;

  const {
    config,
    configHandlers,
    emitConfigFields,
    structureLocked,
    sessionLength,
    previewEnd,
  } = useTimerConfigState(timerState, derived);

  const noMovement = selectedMovement == null;

  function save() {
    getSocket().emit(SocketEvents.SAVE_CONFIG_TIMER, {
      gameType: game.gameType,
      gameId: game.gameId,
      section,
      directorToken: getDirectorToken(game.gameId),
      ...emitConfigFields,
    });
  }

  return (
    <TimerConfigView
      embedded={embedded}
      headerSlot={headerSlot}
      config={config}
      breakProblems={breakProblems}
      sessionLength={sessionLength}
      previewEnd={previewEnd}
      lockedStructure={structureLocked}
      noMovement={noMovement}
      onSave={save}
      {...configHandlers}
    />
  );
}

/**
 * Live timer container for a single section (game in progress). Wires the run
 * controls to the section-scoped timer control events.
 */
function TimerLiveContainer({
  section,
  headerSlot,
}: {
  section: string;
  headerSlot?: React.ReactNode;
}) {
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
      section,
      directorToken: getDirectorToken(game.gameId),
    });
  }

  function onApplyChanges() {
    getSocket().emit(SocketEvents.UPDATE_CONFIG_TIMER, {
      gameType: game.gameType,
      gameId: game.gameId,
      section,
      directorToken: getDirectorToken(game.gameId),
      ...emitConfigFields,
    });
  }

  function onAdjustTime(deltaSeconds: number) {
    getSocket().emit(SocketEvents.ADJUST_TIME_TIMER, {
      gameType: game.gameType,
      gameId: game.gameId,
      section,
      directorToken: getDirectorToken(game.gameId),
      deltaSeconds,
      applyToFutureSameType: adjustApplyToFuture,
    });
  }

  return (
    <TimerLiveView
      headerSlot={headerSlot}
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
 * Timer setup entry point for the game-creation flow's Timer tab. Config-only:
 * the timer cannot be started from setup, only configured. Section navigation
 * (and adding sections) uses the shared section pills, so the director
 * configures each section's timer one at a time.
 */
export function TimerSetup({ embedded = false }: { embedded?: boolean }) {
  const { game } = useRequiredGame();
  const { selected, pills, modal } = useSetupSections(game.gameId);

  if (!selected) return null;

  return (
    <>
      <TimerProvider section={selected} key={selected}>
        <TimerConfigContainer
          section={selected}
          embedded={embedded}
          headerSlot={pills}
        />
      </TimerProvider>
      {modal}
    </>
  );
}

/**
 * Timer management for the standalone /manage/timer route. Shows the live
 * control screen when the game is in progress, and the configuration screen
 * before it has started.
 *
 * Before the game starts, sections can still be added (shared pills with the
 * "+ Add section" affordance). Once it is running, sections are fixed, so the
 * live screen shows plain section pills with no add affordance.
 */
export function TimerManager({ started }: { started: boolean }) {
  const { game } = useRequiredGame();
  const setup = useSetupSections(game.gameId);
  const { sections, selected, setSelected } = setup;

  if (!selected) return null;

  if (started) {
    const livePills = (
      <SectionPills
        sections={sections}
        selected={selected}
        onSelect={setSelected}
      />
    );
    return (
      <TimerProvider section={selected} key={selected}>
        <TimerLiveContainer section={selected} headerSlot={livePills} />
      </TimerProvider>
    );
  }

  return (
    <>
      <TimerProvider section={selected} key={selected}>
        <TimerConfigContainer section={selected} headerSlot={setup.pills} />
      </TimerProvider>
      {setup.modal}
    </>
  );
}
