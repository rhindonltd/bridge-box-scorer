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
 *
 * Stored on `globalThis`, NOT a module-level `const`: game start
 * (`promoteTimerAtGameStart`) schedules from the Next.js route bundle while the
 * live controls (start/pause/next/…) run in the custom-server bundle, and both
 * must operate on the same set of timeouts. A module-local map would live once
 * per bundle. (Same rationale as the engine store in `@/timer/game-store` and
 * the Socket.IO server in `@/socket/websocket`.)
 */
const SCHEDULED_KEY = "__bridgeBoxScheduledGames" as const;

type ScheduledGlobal = typeof globalThis & {
  [SCHEDULED_KEY]?: Map<string, ScheduledGame>;
};

function scheduledGames(): Map<string, ScheduledGame> {
  const g = globalThis as ScheduledGlobal;
  return (g[SCHEDULED_KEY] ??= new Map<string, ScheduledGame>());
}

function scheduleKey(gameId: string, section: SectionLetter): string {
  return `${gameId}:${section}`;
}

export function cancelGameSchedule(gameId: string, section: SectionLetter) {
  const key = scheduleKey(gameId, section);
  const games = scheduledGames();
  const existing = games.get(key);

  if (!existing) {
    return;
  }

  clearTimeout(existing.timeout);

  games.delete(key);
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

  scheduledGames().set(scheduleKey(gameId, section), {
    timeout,
  });
}
