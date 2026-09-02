import { PairSeat, SectionLetter } from "@/model/participants";
import { ExpectedSeats } from "@/model/expected-seats";
import {
  validateStart,
  StartValidationResult,
} from "@/model/start-validator";

/**
 * Input for validating a single section: its letter, the seats its movement
 * expects (null when no movement is selected for the section), and the seats
 * currently filled in that section.
 */
export interface SectionValidationInput {
  section: SectionLetter;
  expected: ExpectedSeats | null;
  seatedSeats: Iterable<PairSeat>;
}

/**
 * The validation outcome for one section, wrapping the per-section
 * StartValidationResult.
 */
export interface SectionValidationResult {
  section: SectionLetter;
  validation: StartValidationResult;
}

export interface AllSectionsValidationResult {
  /** True only when every section can start. */
  canStart: boolean;
  /** Per-section results, in the order provided. */
  sections: SectionValidationResult[];
}

/**
 * Validate every section independently and aggregate. The game can start only
 * when all sections are individually startable (all-or-nothing for the first
 * cut). Each section is validated against its own expected/seated seats via the
 * existing single-section `validateStart`.
 *
 * A game with no sections cannot start.
 */
export function validateSections(
  inputs: SectionValidationInput[],
): AllSectionsValidationResult {
  const sections = inputs.map((input) => ({
    section: input.section,
    validation: validateStart(input.expected, input.seatedSeats),
  }));

  const canStart =
    sections.length > 0 && sections.every((s) => s.validation.canStart);

  return { canStart, sections };
}
