import type { BoardOutcome } from "@/model/score";
import {
  resolveAbsentRow,
  type Absences,
  type AbsenceBoardRow,
} from "@/model/absence";
import type { ParticipantStandingRow } from "@/db/games/queries/ranking-exclusions";

/**
 * PAIRS withdrawals / late arrivals (design §11.4). Rewrite each board row a
 * pair missed through absence, IN MEMORY, into what the scorers should see:
 *
 * - AVERAGE → the row carries an artificial adjusted outcome
 *   (`directorOverrideResult = "A40/60"` etc.), so it is scored exactly like a
 *   director's AVE± ruling — through the same per-board scorers, Neuberg
 *   equalisation and §4.1.1.1 "better than average" uplift.
 * - REMOVED → the row is reported in `removed` and dropped from the returned
 *   rows, so it is not a line for either pair.
 *
 * Rows nobody is absent from are returned unchanged. Shared by the live
 * leaderboard and the USEBIO pairs export so the two always agree.
 */
export function applyAbsences<T extends AbsenceBoardRow>(
  rows: readonly T[],
  absences: Absences,
): T[] {
  if (absences.size === 0) return [...rows];
  const result: T[] = [];
  for (const row of rows) {
    const resolution = resolveAbsentRow(row, absences);
    if (resolution === null) {
      result.push(row);
    } else if (resolution.kind === "outcome") {
      result.push({
        ...row,
        directorOverrideResult: resolution.outcome as BoardOutcome,
      });
    }
    // removed: omitted
  }
  return result;
}

/**
 * The standings rows with every PAIRS withdrawal / late arrival read as
 * ACTIVE, so the shared `resolveStandings` only applies the §2.4.9
 * "without standing" exclusion. Under design §11 an absent pair stays in the
 * ranking — its missed boards are scored (or removed) by {@link applyAbsences}
 * instead of the old half-way / REMOVE / PENALISED rules.
 */
export function pairsStandingsForRanking(
  rows: readonly ParticipantStandingRow[],
): ParticipantStandingRow[] {
  return rows.map((r) =>
    r.standing === "WITHDRAWN" || r.standing === "LATE"
      ? { ...r, standing: "ACTIVE", treatment: null, finePercent: null }
      : r,
  );
}
