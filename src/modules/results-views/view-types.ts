import type { ScoreTable } from "@/modules/results-views/table/score-table";
import type { AssignedPair } from "@/model/participants";

/**
 * Options passed to a view when it builds its table. Currently just the active
 * assignment id used for row highlighting, but kept as an object so views can
 * gain options without changing every signature.
 */
export interface ViewOptions {
  highlightAssignmentId?: string;
  /**
   * Drop the section prefix from pair ids in the rows (e.g. "A1EW" -> "1EW").
   * Set when only one section is in play or results are not combined across
   * sections, so the prefix carries no information.
   */
  hideSection?: boolean;
}

/**
 * One way of showing a result (for example "Matchpoints" or "Percentage").
 * `toTable` is framework-free: it returns a semantic {@link ScoreTable}, never
 * React. Where a result has two views, the first is the default and the pair
 * drives a toggle.
 */
export interface TableView<T> {
  id: string;
  label: string;
  toTable: (data: T, options?: ViewOptions) => ScoreTable;
}

/** One view of a single board's scored lines (a traveller). */
export type PerBoardView<TLines> = TableView<TLines>;

/** One view of a pairs leaderboard, with the pairs it ranks. */
export interface OverallView<TLines> {
  id: string;
  label: string;
  toTable: (
    lines: TLines,
    participants: AssignedPair[],
    options?: ViewOptions,
  ) => ScoreTable;
}
