/**
 * Seating: the pure rules for whether a game can start with the pairs that
 * have sat down. Each section's seats are checked against its movement's
 * round-1 layout, format-specific rules are layered on top (teams structure,
 * the Swiss "2 half matches" group size), and the sections are combined
 * all-or-nothing into the result the start-check screen shows.
 *
 * No React, no I/O: the start service reads the seating and the movement and
 * passes them in.
 */

/* ---------- Seat check ---------- */
export {
  validateStart,
  type StartProblem,
  type StartProblemCode,
  type StartValidationResult,
} from "./start-validator";
export {
  deriveExpectedSeats,
  expectedSeatsFromLayout,
  type ExpectedSeats,
} from "./expected-seats";

/* ---------- Format rules ---------- */
export { validateTeamsStructure } from "./teams-structure";
export { checkHalfMatchField } from "./half-match-field";

/* ---------- All sections ---------- */
export {
  aggregateSections,
  flattenSections,
  type AllSectionsValidationResult,
  type SectionValidationResult,
} from "./validate-sections";
