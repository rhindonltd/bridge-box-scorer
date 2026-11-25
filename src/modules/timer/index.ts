/**
 * timer, pure entry (docs/design/modules.md §11).
 *
 * The bridge session timer: the timer state and its configuration, the engine
 * that steps a section through play, move and break phases, break scheduling
 * and validation, the session timeline projections, and what a timer screen
 * shows. Browser-safe: no framework or I/O. The clock is read with
 * `Date.now()` only where a time is not passed in.
 *
 * The live engines, the phase scheduler and the start-of-game promotion hold
 * process-wide state and touch the games database, so they stay in the core
 * (`src/services/timer/`).
 */

export {
  buildConfiguredTimerState,
  DEFAULT_WARNING_SECONDS,
  getWarningSeconds,
  type BreakConfig,
  type Phase,
  type TimerConfig,
  type TimerState,
} from "./timer-state";
export { BridgeTimerEngine } from "./bridge-timer-engine";
export {
  breakAfterRound,
  computePlayEndByRound,
  gapPhaseAfterRound,
  projectPlayEndByRound,
  resolveBreakDurationMs,
  validateBreaks,
  validateStateBreaks,
  type BreakProblem,
  type GapPhase,
} from "./breaks";
export { breakConfigSchema, toBreakConfigs } from "./break-config-schema";
export { deriveTimerView } from "./timer-derived";
