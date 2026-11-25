/**
 * Scoring: turn ruled rows into numbers — per-board scores, the passes that
 * adjust them, and the standings for the whole event. Pure and browser-safe;
 * depends only on the kernel (`@/model`). See docs/design/modules.md §9.
 *
 * Everything outside `src/modules/scoring` imports from here, never from the
 * module's internal files.
 */

/* ---------- whole event ---------- */
export {
  scoreEvent,
  scoringNeedsMatches,
  scoringNeedsTeams,
  type AdjustedBoardScore,
  type EventParticipants,
  type EventScore,
  type EventSettings,
  type ScoreOptions,
  type SectionStandings,
  type Standings,
} from "./event/score-event";
export type { RuledEvent } from "@/model/ruled-event";

/* ---------- per board ---------- */
export { scoreBoard, type ScoredBoard } from "./traveller/score-traveller";
export { outcomeToScore, computeImps } from "./traveller/common";
export { scoreMP, type MatchpointLine } from "./traveller/pair/mp";
export type { ImpLine } from "./traveller/pair/imp";
export { scoreXIMP, type XimpLine } from "./traveller/pair/x-imp";

/* ---------- board-pooled pairs passes (USEBIO export ranking) ---------- */
export { equaliseMpBoards } from "./traveller/pair/neuberg-across-boards";
export { applyBetterThanAverage } from "./traveller/pair/better-than-average";
export { applyBetterThanAverageXimpBoards } from "./traveller/pair/better-than-average-imp";
export { roundMpBoards } from "./traveller/pair/round-mp-boards";
export { rank } from "./overall/rank";

/* ---------- plugins (per-board and overall scoring) ---------- */
export {
  getCombination,
  getOverallPlugin,
  getPerBoardPlugin,
} from "./plugins/registry";
export type {
  OverallScoringPlugin,
  PerBoardScoringPlugin,
} from "./plugins/types";

/* ---------- Swiss and teams matches ---------- */
export {
  scoreSwissVpRound,
  type SwissRoundMode,
  type SwissVpMatchRow,
} from "./swiss/swiss-vp-round";
export {
  BYE_VP,
  swissPairsByes,
  type SwissPairsBye,
  type SwissVpBoardRow,
} from "./swiss/swiss-vp-overall";
export { segmentsForPair } from "./swiss/swiss-half-match";
export { impVpWinner } from "./swiss/imp-vp-table";
export { voidMatchVp } from "./swiss/team-match-void-score";
export { applyTeamWithdrawalRulings } from "./swiss/team-withdrawal";
export {
  boardResult,
  groupTeamMatches,
  groupTeamTriples,
  matchVoidCause,
  teamMatchBoardImps,
  teamMatchBoardWins,
  tripleVpPool,
  type TeamMatch,
  type TeamMatchRow,
  type TeamMatchStructureRow,
  type TeamTripleKind,
} from "./swiss/team-match";

/* ---------- teams board result (shown by results-views) ---------- */
export {
  teamBoardResult,
  type TeamBoardResult,
  type TeamBoardResultLine,
  type TeamBoardRoomResult,
} from "./swiss/team-board-result";
