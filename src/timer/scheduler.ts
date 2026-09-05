import { BridgeTimerEngine } from "@/timer/bridge-timer-engine";
import { TimerState } from "@/timer/timer-state";
import { SectionLetter } from "@/model/participants";

type SchedulerDeps = {
  updateTimerState: (
    gameId: string,
    section: SectionLetter,
    timerState: TimerState,
  ) => Promise<void>;

  broadcast: (
    gameId: string,
    section: SectionLetter,
    timerState: TimerState,
  ) => void;
};

type ScheduledGame = {
  timeout: NodeJS.Timeout;
};

/**
 * Scheduled phase transitions keyed by `${gameId}:${section}` so each section's
 * timer advances independently.
 */
const scheduledGames = new Map<string, ScheduledGame>();

function scheduleKey(gameId: string, section: SectionLetter): string {
  return `${gameId}:${section}`;
}

export function cancelGameSchedule(gameId: string, section: SectionLetter) {
  const key = scheduleKey(gameId, section);
  const existing = scheduledGames.get(key);

  if (!existing) {
    return;
  }

  clearTimeout(existing.timeout);

  scheduledGames.delete(key);
}

export function scheduleGame(
  gameId: string,
  section: SectionLetter,
  engine: BridgeTimerEngine,
  deps: SchedulerDeps,
) {
  cancelGameSchedule(gameId, section);

  const state = engine.getState();

  if (!state.isRunning) {
    return;
  }

  if (state.phase === "finished") {
    return;
  }

  // Intentional 1-second buffer: ensures the phase transition fires slightly
  // after the displayed timer hits 00:00, giving clients time to render the
  // final tick before the state changes.
  const delay = Math.max(0, engine.getRemainingMs() + 1000);

  const timeout = setTimeout(async () => {
    engine.nextPhase();

    await deps.updateTimerState(gameId, section, engine.getState());

    deps.broadcast(gameId, section, engine.getState());

    /**
     * If the engine auto-continued
     * into the next phase,
     * schedule the next transition.
     */
    scheduleGame(gameId, section, engine, deps);
  }, delay);

  scheduledGames.set(scheduleKey(gameId, section), {
    timeout,
  });
}
