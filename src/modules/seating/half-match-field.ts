import type {
  StartProblem,
  StartValidationResult,
} from "@/modules/seating/start-validator";

/**
 * The Swiss Pairs "2 half matches" group-size check, on top of the base seat
 * check (which already permits the single empty seat of an odd field). When
 * round 1 is a half-match round, the field must have at least three pairs (two
 * tables) to form the group, so a one-table odd field (a single pair) cannot
 * start. Any other start is returned unchanged.
 */
export function checkHalfMatchField(
  base: StartValidationResult,
  { halfMatch, tables }: { halfMatch: boolean; tables: number },
): StartValidationResult {
  if (!halfMatch || tables >= 2) return base;
  const problems: StartProblem[] = [
    ...base.problems,
    {
      code: "HALF_MATCH_FIELD_TOO_SMALL",
      message:
        "A 2-half-matches round needs at least three pairs (two tables). Add a table, or use a bye for this round.",
    },
  ];
  return { canStart: false, problems, sitOutSeat: null };
}
