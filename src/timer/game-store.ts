import { BridgeTimerEngine } from "@/timer/bridge-timer-engine";
import { findTimerState } from "@/db/games/queries/find-timer-state";
import { updateTimerState } from "@/db/games/actions/update-timer-state";
import { TimerState } from "@/timer/timer-state";

const gameMap = new Map<string, BridgeTimerEngine>();

export async function createEngine(
  gameId: string,
  boardsPerRound: number,
  totalRounds: number,
  playDuration: number,
  moveDuration: number,
  options?: {
    breaks?: TimerState["breaks"];
    warningSeconds?: number;
  },
) {
  const newTimerState: TimerState = {
    version: 1,
    phase: "play",
    board: 1,
    round: 1,
    boardsPerRound,
    totalRounds,
    playDuration,
    moveDuration,
    breaks: options?.breaks ?? [],
    warningSeconds: options?.warningSeconds,
    isRunning: false,
    phaseStartedAt: null,
    remainingMs: playDuration * 1000,
    breakDurationMs: null,
  };

  const engine = new BridgeTimerEngine(newTimerState);

  await updateTimerState(gameId, newTimerState);

  gameMap.set(gameId, engine);
  return engine;
}

export async function getEngine(gameId: string) {
  let engine = gameMap.get(gameId);
  if (engine) return engine;

  const timerState = await findTimerState(gameId);

  if (timerState) {
    engine = new BridgeTimerEngine(timerState);
    gameMap.set(gameId, engine);
    return engine;
  }

  return null;
}

export function getAllEngines() {
  return gameMap;
}
