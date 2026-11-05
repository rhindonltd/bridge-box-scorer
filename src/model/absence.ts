import { baseSeatOf } from "@/model/participants";
import {
  AVE_MINUS_PERCENT,
  AVE_PLUS_PERCENT,
} from "@/scoring/artificial-score";

/**
 * PAIRS withdrawals and late arrivals (design `withdrawals-late-arrivals.md`
 * §11). Pure — no I/O — so the leaderboard, the USEBIO export, the results
 * summary and the play flow all decide "is this board row missed because a
 * pair is absent, and how is it scored?" the same way.
 */

/** The director's choice for an absent pair's missed boards. */
export type AbsenceTreatment = "AVERAGE" | "REMOVED";

/**
 * Read a stored treatment as a pairs absence treatment. Null (not yet chosen)
 * is the default AVERAGE; the legacy REMOVE / PENALISED values map to their
 * nearest meaning.
 */
export function normaliseAbsenceTreatment(
  raw: string | null | undefined,
): AbsenceTreatment {
  return raw === "REMOVED" || raw === "REMOVE" ? "REMOVED" : "AVERAGE";
}

/**
 * One absent pair or empty seat, keyed by its BOARD id (the id board rows
 * carry: the occupancy's anchor id, or its seat).
 *
 * - `WITHDRAWN` misses every unplayed board in rounds ≥ `round`.
 * - `LATE` (arrived after the start) missed the boards in rounds < `round`.
 * - `EMPTY` is an expected-late seat nobody has filled yet: it misses every
 *   unplayed board for as long as it stays empty.
 */
export interface Absence {
  kind: "WITHDRAWN" | "LATE" | "EMPTY";
  /** WITHDRAWN: the first round missed. LATE: the arrival round. EMPTY: unused. */
  round: number;
  treatment: AbsenceTreatment;
}

/** Every absence in a game, by board id. */
export type Absences = ReadonlyMap<string, Absence>;

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
