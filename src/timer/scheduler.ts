import { BridgeTimerEngine } from "@/timer/bridge-timer-engine";
import { TimerState } from "@/timer/timer-state";

type SchedulerDeps = {
  updateTimerState: (gameId: string, timerState: TimerState) => Promise<void>;

  broadcast: (gameId: string, timerState: TimerState) => void;
};

type ScheduledGame = {
  timeout: NodeJS.Timeout;
};

const scheduledGames = new Map<string, ScheduledGame>();

export function cancelGameSchedule(gameId: string) {
  const existing = scheduledGames.get(gameId);

  if (!existing) {
    return;
  }

  clearTimeout(existing.timeout);

  scheduledGames.delete(gameId);
}

export function scheduleGame(
  gameId: string,
  engine: BridgeTimerEngine,
  deps: SchedulerDeps,
) {
  cancelGameSchedule(gameId);

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

    await deps.updateTimerState(gameId, engine.getState());

    deps.broadcast(gameId, engine.getState());

    /**
     * If the engine auto-continued
     * into the next phase,
     * schedule the next transition.
     */
    scheduleGame(gameId, engine, deps);
  }, delay);

  scheduledGames.set(gameId, {
    timeout,
  });
}
