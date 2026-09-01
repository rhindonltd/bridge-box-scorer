import { ScoringType } from "@/db/games/types/scoring-type";
import {
  CombinationRegistry,
  OverallPluginId,
  OverallScoringPlugin,
  PerBoardPluginId,
  PerBoardScoringPlugin,
  ScoringCombination,
} from "./types";

/**
 * Per-board and overall plugins are registered here. The maps are populated by
 * each plugin module calling `registerPerBoardPlugin` / `registerOverallPlugin`
 * at import time (see `./register.ts`, which imports every plugin so the
 * registries are fully populated wherever the lookups are used).
 */
const perBoardPlugins = new Map<
  PerBoardPluginId,
  PerBoardScoringPlugin<unknown>
>();
const overallPlugins = new Map<
  OverallPluginId,
  OverallScoringPlugin<unknown, unknown>
>();

export function registerPerBoardPlugin<TLines>(
  plugin: PerBoardScoringPlugin<TLines>,
): void {
  perBoardPlugins.set(
    plugin.id,
    plugin as PerBoardScoringPlugin<unknown>,
  );
}

export function registerOverallPlugin<TScored, TLines>(
  plugin: OverallScoringPlugin<TScored, TLines>,
): void {
  overallPlugins.set(
    plugin.id,
    plugin as OverallScoringPlugin<unknown, unknown>,
  );
}

export function getPerBoardPlugin(
  id: PerBoardPluginId,
): PerBoardScoringPlugin<unknown> {
  const plugin = perBoardPlugins.get(id);
  if (!plugin) {
    throw new Error(`No per-board scoring plugin registered for id "${id}"`);
  }
  return plugin;
}

export function getOverallPlugin(
  id: OverallPluginId,
): OverallScoringPlugin<unknown, unknown> {
  const plugin = overallPlugins.get(id);
  if (!plugin) {
    throw new Error(`No overall scoring plugin registered for id "${id}"`);
  }
  return plugin;
}

/**
 * The valid per-board + overall combinations, keyed by the stored ScoringType.
 * Adding a new scoring type means adding one entry here (plus registering the
 * referenced plugins) — no dispatcher edits required.
 */
const combinations: CombinationRegistry = {
  MP: { perBoard: "MP", overall: "MP" },
  IMP: { perBoard: "IMP", overall: "IMP" },
  XIMP: { perBoard: "XIMP", overall: "XIMP" },
};

export function getCombination(scoringType: ScoringType): ScoringCombination {
  const combination = combinations[scoringType];
  if (!combination) {
    throw new Error(
      `No scoring combination registered for scoring type "${scoringType}"`,
    );
  }
  return combination;
}
