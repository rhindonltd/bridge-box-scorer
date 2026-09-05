import { BridgeTimerEngine } from "@/timer/bridge-timer-engine";
import { findTimerState } from "@/db/games/queries/find-timer-state";
import { updateTimerState } from "@/db/games/actions/update-timer-state";
import { TimerState } from "@/timer/timer-state";
import { SectionLetter } from "@/model/participants";

/**
 * In-memory engines keyed by `${gameId}:${section}` so each section of a game
 * runs an independent timer.
 */
const gameMap = new Map<string, BridgeTimerEngine>();

function engineKey(gameId: string, section: SectionLetter): string {
  return `${gameId}:${section}`;
}

export async function createEngine(
  gameId: string,
  section: SectionLetter,
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

  await updateTimerState(gameId, section, newTimerState);

  gameMap.set(engineKey(gameId, section), engine);
  return engine;
}

export async function getEngine(gameId: string, section: SectionLetter) {
  const key = engineKey(gameId, section);
  let engine = gameMap.get(key);
  if (engine) return engine;

  const timerState = await findTimerState(gameId, section);

  if (timerState) {
    engine = new BridgeTimerEngine(timerState);
    gameMap.set(key, engine);
    return engine;
  }

  return null;
}

export function getAllEngines() {
  return gameMap;
}
