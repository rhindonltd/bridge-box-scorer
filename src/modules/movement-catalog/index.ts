/**
 * movement-catalog, pure entry (docs/design/modules.md §6.2).
 *
 * Every movement whose schedule is fixed before play: the Mitchell variants and
 * Teams Round Robin generators, the recommendations, the display shapes for a
 * movement preview, and turning a described movement into the plan the core
 * writes. Browser-safe: no framework or I/O. The stored catalogue
 * (movements.db and the movement files) is behind `./server`.
 */

// Generation.
export { generateMitchell } from "./generation/mitchell/mitchell";
export type { MitchellMovementSpec } from "./generation/mitchell/mitchell-utils";

// Recommendations. The stored movements are passed in, because the picker
// computes recommendations in the browser.
export { recommendMovements } from "./recommendations/spec-map-recommendations";
export type {
  RecommendedMovement,
  RecommendedMovementSpecRef,
} from "./recommendations/recommendation-types";
export type { CatalogMovementSummary } from "./catalog-summary";

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
