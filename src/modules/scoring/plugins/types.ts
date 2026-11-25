import { Traveller } from "@/model/traveller";
import { ScoringType } from "@/model/game-types";

/**
 * Plugin identifiers. Per-board and overall scoring are two independent
 * concerns, each with their own registry; the combination registry
 * (see `registry.ts`) defines which pairs are valid for a stored ScoringType.
 */
export type PerBoardPluginId = "MP" | "IMP" | "XIMP";
export type OverallPluginId = "MP" | "XIMP";

/* =========================================================
   PER-BOARD (traveller) plugins
========================================================= */

/**
 * A per-board scoring plugin: `score` runs the algorithm for one board.
 * `TLines` is the shape of the scored lines this plugin produces. How the
 * lines are shown is in results-views (`travellerViews`).
 */
export interface PerBoardScoringPlugin<TLines = unknown> {
  id: PerBoardPluginId;
  /** Score a single board's traveller into this plugin's line shape. */
  score: (traveller: Traveller) => TLines;
}

/* =========================================================
   OVERALL (leaderboard) plugins
========================================================= */

/**
 * An overall scoring plugin: `aggregate` combines the per-board scored
 * travellers (of the matching per-board plugin) into overall standings. How
 * they are shown is in results-views (`leaderboardViews`).
 *
 * `TScored` is the per-board scored-traveller shape it consumes; `TLines` is
 * the aggregated leaderboard shape it produces.
 */
export interface OverallScoringPlugin<TScored = unknown, TLines = unknown> {
  id: OverallPluginId;
  aggregate: (scoredTravellers: TScored[]) => TLines;
}

/* =========================================================
   Combination registry
========================================================= */

/**
 * Maps a stored {@link ScoringType} to the per-board and overall plugins used
 * to score and display it. This is the single source of truth that replaces
 * the old duplicated `IMP|XIMP ? "XIMP" : "MP"` mapping.
 */
export interface ScoringCombination {
  perBoard: PerBoardPluginId;
  /**
   * The overall (leaderboard) plugin for the pairs board-pooled path. Absent
   * for teams scorings (BAM/PAB and the teams IMP variants): their standings
   * are produced by the dedicated teams scorers, so the pairs overall plugin
   * is never resolved for them.
   */
  overall?: OverallPluginId;
}

export type CombinationRegistry = Record<ScoringType, ScoringCombination>;
