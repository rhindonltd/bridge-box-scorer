import { BridgeTimerEngine } from "@/timer/bridge-timer-engine";
import { findTimerState } from "@/db/games/shared/queries/find-timer-state";
import { GameType } from "@/db/games/types/game-type";
import { updateTimerState } from "@/db/games/shared/actions/update-timer-state";
import { TimerState } from "@/timer/timer-state";

const gameMap = new Map<string, BridgeTimerEngine>();

export function getEngine(gameId: string) {
  return gameMap.get(gameId);
}

export async function getOrCreateEngine(gameType: GameType, gameId: string) {
  let engine = gameMap.get(`${gameType}_${gameId}`);
  if (engine) return engine;

  const timerState = await findTimerState(gameType, gameId);

  if (timerState) {
    engine = new BridgeTimerEngine(timerState);
  } else {
    const newTimerState: TimerState = {
      version: 1,
      phase: "move",
      board: 1,
      round: 1,
      totalBoards: 3,
      totalRounds: 8,
      playDuration: 120,
      moveDuration: 90,
      isRunning: false,
      phaseStartedAt: null,
      remainingMs: null,
    };

    engine = new BridgeTimerEngine(newTimerState);

    await updateTimerState(gameType, gameId, newTimerState);
  }

  gameMap.set(`${gameType}_${gameId}`, engine);
  return engine;
}

export function getAllEngines() {
  return gameMap;
}
