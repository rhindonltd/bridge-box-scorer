import { ScoringType } from "@/model/game-types";
import {
  CombinationRegistry,
  OverallPluginId,
  OverallScoringPlugin,
  PerBoardPluginId,
  PerBoardScoringPlugin,
  ScoringCombination,
} from "./types";
import { mpPerBoardPlugin } from "./per-board/mp";
import { impPerBoardPlugin } from "./per-board/imp";
import { ximpPerBoardPlugin } from "./per-board/x-imp";
import { mpOverallPlugin } from "./overall/mp";
import { ximpOverallPlugin } from "./overall/x-imp";

/**
 * The per-board and overall plugins, as plain lookup tables. Every plugin is
 * listed here directly, so a lookup never depends on some other module having
 * been imported first.
 */
const perBoardPlugins: Record<
  PerBoardPluginId,
  PerBoardScoringPlugin<unknown>
> = {
  MP: mpPerBoardPlugin as PerBoardScoringPlugin<unknown>,
  IMP: impPerBoardPlugin as PerBoardScoringPlugin<unknown>,
  XIMP: ximpPerBoardPlugin as PerBoardScoringPlugin<unknown>,
};

const overallPlugins: Record<
  OverallPluginId,
  OverallScoringPlugin<unknown, unknown>
> = {
  MP: mpOverallPlugin as OverallScoringPlugin<unknown, unknown>,
  XIMP: ximpOverallPlugin as OverallScoringPlugin<unknown, unknown>,
};

export function getPerBoardPlugin(
  id: PerBoardPluginId,
): PerBoardScoringPlugin<unknown> {
  const plugin = perBoardPlugins[id];
  if (!plugin) {
    throw new Error(`No per-board scoring plugin for id "${id}"`);
  }
  return plugin;
}

export function getOverallPlugin(
  id: OverallPluginId,
): OverallScoringPlugin<unknown, unknown> {
  const plugin = overallPlugins[id];
  if (!plugin) {
    throw new Error(`No overall scoring plugin for id "${id}"`);
  }
  return plugin;
}

/**
 * The valid per-board (+ overall, for pairs) combinations, keyed by the stored
 * ScoringType. Adding a new scoring type means adding one entry here (plus the
 * referenced plugins in the tables above).
 *
 * Pairs is matchpoints or Cross-IMP only, so only MP and XIMP have an overall
 * plugin. The teams scorings (the IMP variants and BAM/PAB) declare only
 * `perBoard`: they reuse the IMP per-board plugin as the raw-score traveller
 * display, and their standings come from the dedicated teams scorers (shown by
 * results-views).
 */
const combinations: CombinationRegistry = {
  MP: { perBoard: "MP", overall: "MP" },
  IMP: { perBoard: "IMP" },
  IMP_VP: { perBoard: "IMP" },
  XIMP: { perBoard: "XIMP", overall: "XIMP" },
  BAM: { perBoard: "IMP" },
  PAB: { perBoard: "IMP" },
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
