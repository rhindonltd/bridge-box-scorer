import { ScoreTable } from "@/scoring/table/score-table";
import { Traveller } from "@/model/traveller";
import { AssignedPair } from "@/model/participants";
import { ScoringType } from "@/db/games/types/scoring-type";

/**
 * Plugin identifiers. Per-board and overall scoring are two independent
 * concerns, each with their own registry; the combination registry
 * (see `registry.ts`) defines which pairs are valid for a stored ScoringType.
 */
export type PerBoardPluginId = "MP" | "IMP" | "XIMP";
export type OverallPluginId = "MP" | "IMP" | "XIMP";

/**
 * Options passed to a view when it builds its table. Currently just the active
 * assignment id used for row highlighting, but kept as an object so views can
 * gain options without changing every signature.
 */
export interface ViewOptions {
  highlightAssignmentId?: string;
}

/* =========================================================
   PER-BOARD (traveller) plugins
========================================================= */

/**
 * A single way of presenting a per-board scoring result (e.g. MP exposes a
 * "matchpoints" view and a "percentage" view). `toTable` is framework-free: it
 * returns a semantic {@link ScoreTable}, never React.
 */
export interface PerBoardView<TLines> {
  id: string;
  label: string;
  toTable: (scored: TLines, options?: ViewOptions) => ScoreTable;
}

/**
 * A per-board scoring plugin. `score` runs the algorithm for one board and
 * `views` describe how the result can be displayed. `TLines` is the shape of
 * the scored lines this plugin produces.
 */
export interface PerBoardScoringPlugin<TLines = unknown> {
  id: PerBoardPluginId;
  /** Score a single board's traveller into this plugin's line shape. */
  score: (traveller: Traveller) => TLines;
  /** Presentation views. The first entry is the default. */
  views: PerBoardView<TLines>[];
}

/* =========================================================
   OVERALL (leaderboard) plugins
========================================================= */

export interface OverallView<TLines> {
  id: string;
  label: string;
  toTable: (
    lines: TLines,
    participants: AssignedPair[],
    options?: ViewOptions,
  ) => ScoreTable;
}

/**
 * An overall scoring plugin. `aggregate` combines the per-board scored
 * travellers (of the matching per-board plugin) into overall standings, and
 * `views` describe how the leaderboard can be displayed.
 *
 * `TScored` is the per-board scored-traveller shape it consumes; `TLines` is
 * the aggregated leaderboard shape it produces.
 */
export interface OverallScoringPlugin<TScored = unknown, TLines = unknown> {
  id: OverallPluginId;
  aggregate: (scoredTravellers: TScored[]) => TLines;
  views: OverallView<TLines>[];
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
  overall: OverallPluginId;
}

export type CombinationRegistry = Record<ScoringType, ScoringCombination>;
