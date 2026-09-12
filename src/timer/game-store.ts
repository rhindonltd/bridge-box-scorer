import { BridgeTimerEngine } from "@/timer/bridge-timer-engine";
import { findTimerState } from "@/db/games/queries/find-timer-state";
import { updateTimerState } from "@/db/games/actions/update-timer-state";
import { TimerState } from "@/timer/timer-state";
import { SectionLetter } from "@/model/participants";

/**
 * In-memory engines keyed by `${gameId}:${section}` so each section of a game
 * runs an independent timer.
 *
 * Stored on `globalThis`, NOT a module-level `const`. The app runs as two
 * separate bundles (the tsx/esbuild custom server and the Next.js route
 * handlers), each with its own copy of this module. HTTP routes create/clear
 * engines (game start, movement change, timer-config save) while socket
 * handlers read them (request-state, live controls); a module-local map would
 * live once per bundle, so those two sides would never see the same engines.
 * A process-wide `globalThis` slot gives the single running process one shared
 * store across both bundles. (Same rationale as the Socket.IO server in
 * `@/socket/websocket`.)
 */
const ENGINES_KEY = "__bridgeBoxTimerEngines" as const;

type EnginesGlobal = typeof globalThis & {
  [ENGINES_KEY]?: Map<string, BridgeTimerEngine>;
};

function gameMap(): Map<string, BridgeTimerEngine> {
  const g = globalThis as EnginesGlobal;
  return (g[ENGINES_KEY] ??= new Map<string, BridgeTimerEngine>());
}

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

  gameMap().set(engineKey(gameId, section), engine);
  return engine;
}

export async function getEngine(gameId: string, section: SectionLetter) {
  const key = engineKey(gameId, section);
  const engines = gameMap();
  let engine = engines.get(key);
  if (engine) return engine;

  const timerState = await findTimerState(gameId, section);

  if (timerState) {
    engine = new BridgeTimerEngine(timerState);
    engines.set(key, engine);
    return engine;
  }

  return null;
}

/**
 * Drop any in-memory engine for a section so a later `getEngine` re-reads from
 * persisted state (or returns null when it has been cleared). Used when a
 * section's timer is cleared — e.g. its movement changed — so the stale engine
 * doesn't keep serving the old config. Returns true when an engine was removed.
 */
export function clearEngine(gameId: string, section: SectionLetter): boolean {
  return gameMap().delete(engineKey(gameId, section));
}

export function getAllEngines() {
  return gameMap();
}
