/**
 * play-flow, pure entry (docs/design/modules.md §11).
 *
 * The player's side of a session: the schedule a pair plays (built from its
 * board rows), where a seat is in it (the current round, resting rounds and the
 * within-round position), the dual-side confirmation rule for submitted
 * results, the table round status, and the player's screen flow. Pure: the
 * core reads the rows and submissions and passes them in; the hooks and socket
 * handlers drive it. Browser-safe.
 */

// The pair's schedule.
export {
  buildScheduleRounds,
  type HalfMatchSegment,
  type PairBoardRow,
  type ScheduleHalfMatch,
  type ScheduleInput,
  type SchedulePairPlayers,
  type ScheduleRound,
  type TablePlayers,
} from "./schedule";

// Where a seat is in the event.
export {
  resolvePlayPhase,
  type PlayReads,
  type ResolvedPlayState,
  type WithinRoundPosition,
} from "./play-position";

// Dual-side confirmation of a board's result.
export {
  reconcileSubmissions,
  type PendingSubmission,
  type Reconciliation,
} from "./reconcile-submissions";

// Whether a board has a result entered.
export { isBoardEntered } from "./round-status";

// The player's screen flow.
export {
  playReducer,
  playStateFromResolved,
  type PlayAction,
  type PlayState,
  type Schedule,
} from "./play-state-machine";
