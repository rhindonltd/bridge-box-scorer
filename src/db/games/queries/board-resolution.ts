import { isAbsentRow, type Absences } from "@/model/absence";

/** The board-row facts that decide whether a board still needs a result. */
export interface ResolutionRow {
  status: string | null;
  ruling: string | null;
  ns: string;
  ew: string;
  roundNumber: number;
  confirmedResult: unknown | null;
  directorOverrideResult: unknown | null;
}

/** Statuses a pair never plays at all (not counted as playable). */
const NON_PLAYABLE = new Set(["SIT_OUT", "HALF_AVERAGE"]);

/** Statuses that finalise a board. */
const FINALISED = new Set([
  "CONFIRMED",
  "OVERRIDDEN",
  "CANCELLED",
  "REMOVED_TEAMS",
  // Design §11: missed because a pair withdrew / arrived late.
  "ABSENT",
]);

/** Whether a row is a board that is meant to be played at its table. */
export function isPlayableRow(row: Pick<ResolutionRow, "status">): boolean {
  return !NON_PLAYABLE.has(row.status ?? "");
}

/**
 * Whether a playable row no longer needs a result: a finalising status, a
 * match-level ruling, or a pair on it is absent (design §11 — including a
 * still-empty expected-late seat, whose boards cannot be played while it is
 * empty). Shared by the results summary and the outstanding-boards list so the
 * two always agree.
 */
export function isResolvedRow(row: ResolutionRow, absences: Absences): boolean {
  return (
    FINALISED.has(row.status ?? "") ||
    row.ruling != null ||
    isAbsentRow(row, absences)
  );
}
