import type {
  StartProblem,
  StartValidationResult,
} from "@/modules/seating/start-validator";

/**
 * The structural validations both teams formats share, on top of the base seat
 * validation: every table must hold a full team (no single sit-out — that would
 * be half a team). `label` names the format in the director-facing messages.
 *
 * Odd team counts: by default an odd count is rejected (Swiss Teams with no
 * odd handling). When `oddHandling` is supplied (Swiss Teams),
 * "BYE" permits an odd count (one team sits out each round) and "TRIPLE"
 * permits it too (three teams play a three-way each round) — a triple needs
 * at least three teams to form, so an odd field of one is still rejected.
 * `anyTeamCount` (a stored teams movement, which fills every table every
 * round) accepts any team count.
 */
export function validateTeamsStructure(
  baseValidation: StartValidationResult,
  teams: number,
  options: {
    label: string;
    oddHandling?: "BYE" | "TRIPLE";
    anyTeamCount?: boolean;
  },
): StartValidationResult {
  const { label, oddHandling, anyTeamCount = false } = options;
  const problems: StartProblem[] = [...baseValidation.problems];

  if (baseValidation.sitOutSeat !== null) {
    problems.push({
      code: "TEAMS_SIT_OUT_NOT_ALLOWED",
      message: `${label} needs a full team at every table — seat both pairs or remove the table. Sit-outs are not supported.`,
    });
  }

  if (teams % 2 !== 0 && !anyTeamCount) {
    if (oddHandling === "TRIPLE") {
      // A triple needs three teams to form the three-way.
      if (teams < 3) {
        problems.push({
          code: "ODD_TEAM_COUNT",
          message: `${label} with a three-way triple needs at least three teams — you have ${teams}. Add a table before starting.`,
        });
      }
      // teams >= 3 (odd): allowed (the bottom three play a three-way each round).
    } else if (oddHandling !== "BYE") {
      // No odd handling for this format/choice: an odd count is rejected.
      problems.push({
        code: "ODD_TEAM_COUNT",
        message: `${label} needs an even number of teams — you have ${teams}. Add or remove a table before starting.`,
      });
    }
    // oddHandling === "BYE": an odd count is allowed (a team byes each round).
  }

  return { canStart: problems.length === 0, sitOutSeat: null, problems };
}
