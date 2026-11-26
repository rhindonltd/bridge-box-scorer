import type { SectionLetter } from "@/model/participants";
import type {
  StartProblem,
  StartValidationResult,
} from "@/modules/seating/start-validator";

/** The start check for one section. */
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
 * Aggregate the sections' start checks: the game can start only when every
 * section can (all-or-nothing), and a game with no sections cannot start.
 */
export function aggregateSections(
  sections: SectionValidationResult[],
): AllSectionsValidationResult {
  const canStart =
    sections.length > 0 && sections.every((s) => s.validation.canStart);
  return { canStart, sections };
}

/**
 * Flatten the sections' start checks into the single result the start-check
 * screen shows. `canStart` is the all-or-nothing aggregate; each problem is
 * tagged with its `section` so the screen can group by section. `sitOutSeat`
 * is null here: each section's sit-out is applied when that section starts.
 */
export function flattenSections(
  aggregate: AllSectionsValidationResult,
): StartValidationResult {
  if (aggregate.sections.length === 0) {
    return {
      canStart: false,
      sitOutSeat: null,
      problems: [
        {
          code: "NO_MOVEMENT_SELECTED",
          message: "Add at least one section before starting the game.",
        },
      ],
    };
  }

  // The message stays plain (the grouping shows which section); the section
  // field is the structured source of truth.
  const problems: StartProblem[] = [];
  for (const s of aggregate.sections) {
    for (const p of s.validation.problems) {
      problems.push({ ...p, section: s.section });
    }
  }

  return { canStart: aggregate.canStart, sitOutSeat: null, problems };
}
