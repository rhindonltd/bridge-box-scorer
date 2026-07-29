import { BridgeTimerEngine } from "@/timer/bridge-timer-engine";
import { findTimerState } from "@/db/games/shared/queries/find-timer-state";
import { GameType } from "@/db/games/types/game-type";
import { updateTimerState } from "@/db/games/shared/actions/update-timer-state";
import { TimerState } from "@/timer/timer-state";

const gameMap = new Map<string, BridgeTimerEngine>();

export async function createEngine(
  gameType: GameType,
  gameId: string,
  boardsPerRound: number,
  totalRounds: number,
  playDuration: number,
  moveDuration: number,
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
    isRunning: true,
    phaseStartedAt: null,
    remainingMs: playDuration * 1000,
  };

  const engine = new BridgeTimerEngine(newTimerState);

  await updateTimerState(gameType, gameId, newTimerState);

  gameMap.set(`${gameType}_${gameId}`, engine);
  return engine;
}

export async function getEngine(gameType: GameType, gameId: string) {
  let engine = gameMap.get(`${gameType}_${gameId}`);
  if (engine) return engine;

  const timerState = await findTimerState(gameType, gameId);

  if (timerState) {
    engine = new BridgeTimerEngine(timerState);
    gameMap.set(`${gameType}_${gameId}`, engine);
    return engine;
  }

  return null;
}

export function getAllEngines() {
  return gameMap;
}
