/**
 * Results views: turn scoring's numbers into `ScoreTable`s — the traveller,
 * the leaderboard (all formats), the personal scorecard and the teams
 * board-result table. A `ScoreTable` is a plain description of rows and cells;
 * React components in `src/components/scoring/` render it. Pure and
 * browser-safe; depends only on the kernel (`@/model`) and scoring's types.
 * See docs/design/modules.md §10.
 *
 * Everything outside `src/modules/results-views` imports from here, never from
 * the module's internal files.
 */

/* ---------- views ---------- */
export { travellerViews, leaderboardViews } from "./views";
export type { TableView, ViewOptions } from "./view-types";

/* ---------- table model ---------- */
export {
  contractCell,
  expandableCell,
  formatNumberCell,
  multilineCell,
  numberCell,
  textCell,
  type ScoreCell,
  type ScoreTable,
} from "./table/score-table";

/* ---------- scorecard ---------- */
export {
  buildScorecardTable,
  buildScorecardVpTable,
  scorecardViews,
} from "./scorecard/scorecard-table";
export { adjustedScoreLookup, swissRoundVps } from "./scorecard/scorecard-figures";

/* ---------- teams board result ---------- */
export { teamBoardResultTable } from "./team-board-result/team-board-result-table";
