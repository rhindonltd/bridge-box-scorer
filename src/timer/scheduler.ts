import { GameType } from "@/db/games/types/game-type";
import { BridgeTimerEngine } from "@/timer/bridge-timer-engine";
import { TimerState } from "@/timer/timer-state";

type SchedulerDeps = {
  updateTimerState: (
    gameType: GameType,
    gameId: string,
    timerState: TimerState,
  ) => Promise<void>;

  broadcast: (gameId: string, timerState: TimerState) => void;
};

type ScheduledGame = {
  timeout: NodeJS.Timeout;
};

const scheduledGames = new Map<string, ScheduledGame>();

export function cancelGameSchedule(gameType: string, gameId: string) {
  const existing = scheduledGames.get(`${gameType}_${gameId}`);

  if (!existing) {
    return;
  }

  clearTimeout(existing.timeout);

  scheduledGames.delete(`${gameType}_${gameId}`);
}

export function scheduleGame(
  gameType: GameType,
  gameId: string,
  engine: BridgeTimerEngine,
  deps: SchedulerDeps,
) {
  cancelGameSchedule(gameType, gameId);

  const state = engine.getState();

  if (!state.isRunning) {
    return;
  }

  if (state.phase === "finished") {
    return;
  }

  const delay = Math.max(0, engine.getRemainingMs() + 1000);

  const timeout = setTimeout(async () => {
    engine.nextPhase();

    await deps.updateTimerState(gameType, gameId, engine.getState());

    deps.broadcast(gameId, engine.getState());

    /**
     * If the engine auto-continued
     * into the next phase,
     * schedule the next transition.
     */
    scheduleGame(gameType, gameId, engine, deps);
  }, delay);

  scheduledGames.set(`${gameType}_${gameId}`, {
    timeout,
  });
}
