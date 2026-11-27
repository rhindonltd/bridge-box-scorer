/**
 * movement-catalog, pure entry (docs/design/modules.md §6.2).
 *
 * Every movement whose schedule is fixed before play: the Mitchell variants and
 * American Whist teams generators, the recommendations, the display shapes for a
 * movement preview, and turning a described movement into the plan the core
 * writes. Browser-safe: no framework or I/O. The stored catalogue
 * (movements.db and the movement files) is behind `./server`.
 */

// Generation.
export { generateMitchell } from "./pairs/mitchell/mitchell";
export type { MitchellMovementSpec } from "./pairs/mitchell/mitchell-utils";

// Recommendations. The stored movements are passed in, because the picker
// computes recommendations in the browser.
export { recommendMovements } from "./recommendations/spec-map-recommendations";
export type {
  RecommendedMovement,
  RecommendedMovementSpecRef,
} from "./recommendations/recommendation-types";
export type {
  CatalogMovementSummary,
  TeamsCatalogMovementSummary,
} from "./catalog-summary";

// Teams movements: the American Whist, Circulation, Thurner and Stagger
// generators and the options a Teams game can choose (those plus the teams library).
export {
  generateAmericanWhistTeams,
  isAmericanWhistTeamCount,
  type AmericanWhistTeamsSpec,
} from "./teams/american-whist-teams/american-whist-teams";
export {
  generateCirculationTeams,
  type CirculationTeamsSpec,
} from "./teams/circulation-teams/circulation-teams";
export {
  generateThurnerTeams,
  isThurnerTeamCount,
  type ThurnerTeamsSpec,
} from "./teams/thurner-teams/thurner-teams";
export {
  generateStaggerTeams,
  isStaggerTeamCount,
  type StaggerTeamsSpec,
} from "./teams/stagger-teams/stagger-teams";
export {
  generateHeadToHeadTeams,
  type HeadToHeadTeamsSpec,
} from "./teams/head-to-head-teams/head-to-head-teams";
export {
  americanWhistPreview,
  circulationPreview,
  headToHeadPreview,
  headToHeadSetOut,
  circulationSetOut,
  staggerPreview,
  thurnerPreview,
  teamsMovementOptions,
  type TeamsMovementOption,
  type TeamsMovementRef,
} from "./teams/teams-options";
// Display shapes and helpers.
export {
  buildRounds,
  generatedToMovementByTable,
  type MovementByRound,
  type MovementByTable,
} from "./display/movementData";
export {
  buildTablePlacement,
  withRelay,
  type RelayContext,
  type TablePlacement,
} from "./display/table-placement";
export {
  fixedMovementSetup,
  stationaryFromTables,
  type MovementResolution,
  type StationaryDirections,
} from "./display/movement-setup";

// Planning a fixed movement for the start of a game.
export type {
  FixedSelectedMovement,
  MovementDescription,
} from "./plan/describe-movement";
export { planMovement } from "./plan/plan-movement";
// Where a movement calls a score-up beyond its match ends.
export { declaredScoreBreakRounds } from "./teams/score-breaks";
