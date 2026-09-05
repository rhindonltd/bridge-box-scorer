"use client";

import { useRequiredGame } from "@/context/GameContext";
import { TimerProvider, useTimerContext } from "@/context/TimerContext";
import { useEffect, useState } from "react";
import { TimerConfigView } from "./TimerConfigView";
import { TimerLiveView } from "./TimerLiveView";
import { TimerSectionPicker } from "./TimerSectionPicker";
import { TimerStatus } from "./timer-view-types";
import { useTimerConfigState } from "./useTimerConfigState";
import { useTimerDerived } from "@/hooks/timer-derived";
import { useSections, ClientSection } from "@/hooks/sections";
import { getSocket } from "@/lib/socket";
import { getDirectorToken } from "@/lib/director-token";
import { SocketEvents } from "@/socket/socket-events";

// Re-exported for existing consumers/tests; the implementations now live with
// the shared config-state hook.
export { resumeAtToMs, msToLabel } from "./useTimerConfigState";

/**
 * Timer configuration container for a single section (setup / not-yet-started).
 * Emits `timer:saveConfig` for its section on Save, and — when the game has
 * more than one section — an "Apply to all sections" that saves the current
 * config to every section.
 */
function TimerConfigContainer({
  section,
  embedded = false,
  headerSlot,
  allSections,
}: {
  section: string;
  embedded?: boolean;
  headerSlot?: React.ReactNode;
  /** All section letters, used by "Apply to all sections". */
  allSections: string[];
}) {
  const { game } = useRequiredGame();
  const { timerState, breakProblems } = useTimerContext();

  const {
    config,
    configHandlers,
    emitConfigFields,
    sessionLength,
    previewEnd,
  } = useTimerConfigState(timerState);

  function saveFor(targetSection: string) {
    getSocket().emit(SocketEvents.SAVE_CONFIG_TIMER, {
      gameType: game.gameType,
      gameId: game.gameId,
      section: targetSection,
      directorToken: getDirectorToken(game.gameId),
      ...emitConfigFields,
    });
  }

  const multiSection = allSections.length > 1;

  return (
    <TimerConfigView
      embedded={embedded}
      headerSlot={headerSlot}
      config={config}
      breakProblems={breakProblems}
      sessionLength={sessionLength}
      previewEnd={previewEnd}
      onSave={() => saveFor(section)}
      onApplyToAll={
        multiSection
          ? () => allSections.forEach((s) => saveFor(s))
          : undefined
      }
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
 * Choose the section to operate on. Single-section games have no picker and use
 * that one section; multi-section games default to the first and let the
 * director switch. Returns null while sections are still loading.
 */
function useSelectedSection(gameId: string): {
  sections: ClientSection[];
  selected: string | null;
  setSelected: (s: string) => void;
} {
  const { sections } = useSections(gameId);
  const [selected, setSelected] = useState<string | null>(null);

  // Default to the first section once sections load; keep the director's choice
  // otherwise. If the selected section disappears, fall back to the first.
  const first = sections[0]?.section ?? null;
  const stillPresent =
    selected != null && sections.some((s) => s.section === selected);
  const effective = stillPresent ? selected : first;

  return { sections, selected: effective, setSelected };
}

/**
 * Timer setup entry point for the game-creation flow's Timer tab. Config-only:
 * the timer cannot be started from setup, only configured. Multi-section games
 * get a section selector; single-section games show that one section directly.
 */
export function TimerSetup({ embedded = false }: { embedded?: boolean }) {
  const { game } = useRequiredGame();
  const { sections, selected, setSelected } = useSelectedSection(game.gameId);

  if (!selected) return null;

  const allSections = sections.map((s) => s.section);
  const picker =
    sections.length > 1 ? (
      <TimerSectionPicker
        sections={sections}
        selected={selected}
        onSelect={setSelected}
      />
    ) : undefined;

  return (
    <TimerProvider section={selected} key={selected}>
      <TimerConfigContainer
        section={selected}
        embedded={embedded}
        headerSlot={picker}
        allSections={allSections}
      />
    </TimerProvider>
  );
}

/**
 * Timer management for the standalone /manage/timer route. Shows the live
 * control screen when the game is in progress, and the configuration screen
 * before it has started. Multi-section games get a section selector.
 */
export function TimerManager({ started }: { started: boolean }) {
  const { game } = useRequiredGame();
  const { sections, selected, setSelected } = useSelectedSection(game.gameId);

  if (!selected) return null;

  const allSections = sections.map((s) => s.section);
  const picker =
    sections.length > 1 ? (
      <TimerSectionPicker
        sections={sections}
        selected={selected}
        onSelect={setSelected}
      />
    ) : undefined;

  return (
    <TimerProvider section={selected} key={selected}>
      {started ? (
        <TimerLiveContainer section={selected} headerSlot={picker} />
      ) : (
        <TimerConfigContainer
          section={selected}
          headerSlot={picker}
          allSections={allSections}
        />
      )}
    </TimerProvider>
  );
}
