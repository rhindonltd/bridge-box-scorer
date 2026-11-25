import { baseSeatOf } from "@/model/participants";
import { AVE_MINUS_PERCENT, AVE_PLUS_PERCENT } from "@/model/artificial-score";
import type { Absence, Absences } from "@/model/absence";

/**
 * PAIRS withdrawals and late arrivals (design `withdrawals-late-arrivals.md`
 * §11): decide "is this board row missed because a pair is absent, and how is
 * it scored?" the same way for the leaderboard, the USEBIO export, the results
 * summary and the play flow.
 */

/** The minimal board-row shape needed to resolve an absent row. */
export interface AbsenceBoardRow {
  ns: string;
  ew: string;
  roundNumber: number;
  confirmedResult: unknown | null;
  directorOverrideResult: unknown | null;
}

/** Whether the pair with board id `id` is absent for a board in `round`. */
function absenceFor(
  absences: Absences,
  id: string,
  round: number,
): Absence | undefined {
  const a = absences.get(baseSeatOf(id));
  if (!a) return undefined;
  switch (a.kind) {
    case "WITHDRAWN":
      return round >= a.round ? a : undefined;
    case "LATE":
      return round < a.round ? a : undefined;
    case "EMPTY":
      return a;
  }
}

/**
 * How a board row is scored when one of its pairs is absent:
 *
 * - `null` — not an absent row (nobody absent, or it carries a real result,
 *   which always stands): score it normally.
 * - `{ kind: "removed" }` — the row is out of the movement: no line at all, so
 *   the opponent is ranked over fewer boards.
 * - `{ kind: "outcome", outcome }` — an artificial adjusted score, valued
 *   exactly like a director's AVE± ruling: the absent pair AVE−, its opponent
 *   AVE+ (e.g. absent NS → `A40/60`). When BOTH pairs are absent the row is an
 *   AVE−/AVE− (`A40/40`) if both chose AVERAGE, otherwise removed.
 */
export type AbsentRowResolution =
  { kind: "removed" } | { kind: "outcome"; outcome: string } | null;

export function resolveAbsentRow(
  row: AbsenceBoardRow,
  absences: Absences,
): AbsentRowResolution {
  if (absences.size === 0) return null;
  if ((row.directorOverrideResult ?? row.confirmedResult) != null) return null;

  const ns = absenceFor(absences, row.ns, row.roundNumber);
  const ew = absenceFor(absences, row.ew, row.roundNumber);
  if (!ns && !ew) return null;

  if (ns && ew) {
    return ns.treatment === "AVERAGE" && ew.treatment === "AVERAGE"
      ? {
          kind: "outcome",
          outcome: `A${AVE_MINUS_PERCENT}/${AVE_MINUS_PERCENT}`,
        }
      : { kind: "removed" };
  }

  const absent = (ns ?? ew)!;
  if (absent.treatment === "REMOVED") return { kind: "removed" };
  return {
    kind: "outcome",
    outcome: ns
      ? `A${AVE_MINUS_PERCENT}/${AVE_PLUS_PERCENT}`
      : `A${AVE_PLUS_PERCENT}/${AVE_MINUS_PERCENT}`,
  };
}

/**
 * Whether a board row counts as resolved because a pair on it is absent —
 * regardless of the treatment (an AVERAGE row is scored, a REMOVED row is out
 * of the movement; neither is waiting for a result).
 */
export function isAbsentRow(row: AbsenceBoardRow, absences: Absences): boolean {
  return resolveAbsentRow(row, absences) !== null;
}
