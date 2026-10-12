import { Db } from "@/db/games";
import { participants } from "@/db/games/tables/participants";

/**
 * The minimal participant lifecycle row the standing resolver needs. Kept
 * structural so the resolver (`resolveStandings`) is a pure function unit tests
 * can drive with plain objects.
 */
export interface ParticipantStandingRow {
  seat: string;
  standing: "ACTIVE" | "WITHDRAWN" | "WITHOUT_STANDING" | "LATE";
  treatment: "REMOVE" | "PENALISED" | null;
  finePercent: number | null;
}

/**
 * The minimal board-row shape the §2.4.7 half-boards retain-standing test needs:
 * which contestant sat on each seat and whether the board carries a result.
 */
export interface StandingBoardRow {
  ns: string;
  ew: string;
  boardNumber: number;
  confirmedResult: unknown | null;
  directorOverrideResult: unknown | null;
}

/**
 * A withdrawn (or late-arrival-fallen-short) pair, for the §2.4.3–§2.4.7
 * scoring passes. Carries BOTH the self-credit facts (treatment + fine, for the
 * contestant's own §2.4.5 score) and enough to drive the opponents' §2.4.4
 * indemnity — which applies to EVERY such contestant (REMOVE and PENALISED
 * alike), because an opponent's lost boards are indemnified regardless of how
 * the contestant itself is scored.
 */
export interface WithdrawalRecord {
  seat: string;
  /** §2.4.5 treatment chosen by the director. */
  treatment: "REMOVE" | "PENALISED";
  /** The 0..40% fine (0 for REMOVE / unset). */
  finePercent: number;
  /**
   * §2.4.7 "half-table at the start": when true, the seat's opponents get AVE+
   * on every unplayed board UNCONDITIONALLY — not gated on the before/after-half
   * split. Set for a director-marked EMPTY "expected late" seat: while the pair
   * is still expected, the White Book credits the opponents AVE+ for the boards
   * they cannot play (reference §6.6), independent of how many boards have been
   * played so far. Absent/false for an ordinary withdrawal, which keeps the
   * §2.4.4 before-half-cancel / after-half-AVE+ behaviour.
   */
  alwaysIndemnifyOpponent?: boolean;
}

/** Read every participant's lifecycle standing (seat + treatment + fine). */
export async function readParticipantStandings(
  db: Db,
): Promise<ParticipantStandingRow[]> {
  const rows = await db
    .select({
      initialSeat: participants.initialSeat,
      standing: participants.standing,
      withdrawalTreatment: participants.withdrawalTreatment,
      withdrawalFinePercent: participants.withdrawalFinePercent,
    })
    .from(participants);

  return rows.map((r) => ({
    seat: r.initialSeat,
    standing: r.standing,
    treatment: r.withdrawalTreatment,
    finePercent: r.withdrawalFinePercent,
  }));
}

/**
 * The number of distinct scheduled boards an event has — the whole movement is
 * materialised up front — read from the board rows. The §2.4.7 "present for at
 * least HALF the boards" test (and the §2.4.4/§2.4.5 half-event split) measures
 * against ⌈total / 2⌉.
 */
function halfBoardThreshold(boardRows: readonly StandingBoardRow[]): number {
  const boardNumbers = new Set<number>();
  for (const row of boardRows) boardNumbers.add(row.boardNumber);
  return Math.ceil(boardNumbers.size / 2);
}

/** How many boards a given seat actually PLAYED (its row carries a result). */
function playedBoardsBySeat(
  boardRows: readonly StandingBoardRow[],
): Map<string, number> {
  const played = new Map<string, number>();
  for (const row of boardRows) {
    const hasResult =
      row.directorOverrideResult != null || row.confirmedResult != null;
    if (!hasResult) continue;
    for (const seat of [row.ns, row.ew]) {
      played.set(seat, (played.get(seat) ?? 0) + 1);
    }
  }
  return played;
}

/**
 * EBU White Book §2.4.7 — whether a `LATE` contestant RETAINS its standing:
 * true when it was present for at least HALF the event's boards (then it is
 * ranked normally and its treatment is moot); false when it played fewer, in
 * which case its unplayed (early) boards are scored per §2.4.6 exactly like a
 * withdrawer. Measured from boards actually played, consistent with the
 * §2.4.4/§2.4.5 before/after-half split.
 */
function lateRetainsStanding(
  seat: string,
  playedBySeat: Map<string, number>,
  half: number,
): boolean {
  return (playedBySeat.get(seat) ?? 0) >= half;
}

/**
 * Resolve every participant's lifecycle standing into the two derived scoring
 * facts, applying the §2.4.7 half-boards retain-standing test for `LATE`
 * arrivals:
 *
 * - `excludedFromRanking` (§2.4.9): the ids dropped from the ranking — a
 *   `WITHOUT_STANDING` contestant, a `WITHDRAWN` + `REMOVE` one, or a `LATE`
 *   contestant that fell SHORT of half the boards and was given `REMOVE`.
 * - `withdrawals` (§2.4.3–§2.4.7): the pairs whose unplayed boards are scored
 *   per §2.4.6 — every `WITHDRAWN` pair, plus every `LATE` pair that fell short
 *   of half (its early boards score AVE−/void). A `LATE` pair that reached half
 *   RETAINS standing: it is neither excluded nor credited (scored normally).
 *
 * Both are keyed on `initialSeat` — the same id a pair line (`pairId`) and a
 * team line (`teamId`, the home-NS seat) carry — so the live leaderboard and
 * the USEBIO export agree.
 */
export function resolveStandings(
  rows: readonly ParticipantStandingRow[],
  boardRows: readonly StandingBoardRow[],
): { excludedFromRanking: Set<string>; withdrawals: WithdrawalRecord[] } {
  const half = halfBoardThreshold(boardRows);
  const playedBySeat = playedBoardsBySeat(boardRows);

  const excludedFromRanking = new Set<string>();
  const withdrawals: WithdrawalRecord[] = [];

  for (const r of rows) {
    // A LATE arrival that was present for at least half the boards keeps its
    // standing — treated as ACTIVE for scoring, so it is skipped entirely.
    const lateShort =
      r.standing === "LATE" &&
      !lateRetainsStanding(r.seat, playedBySeat, half);

    // Whether this contestant's UNPLAYED boards are scored per §2.4.6: every
    // WITHDRAWN pair, plus a short LATE arrival. A treatment with no recorded
    // value defaults to REMOVE (dropped from the ranking; opponents still
    // indemnified), the safe conservative choice — used by BOTH the exclusion
    // and the credit so the two never disagree.
    const scoredAsAbsent = r.standing === "WITHDRAWN" || lateShort;
    const treatment = r.treatment ?? "REMOVE";

    // §2.4.9 ranking exclusion: without-standing always; an absent contestant
    // (withdrawer or short latecomer) given REMOVE.
    if (
      r.standing === "WITHOUT_STANDING" ||
      (scoredAsAbsent && treatment === "REMOVE")
    ) {
      excludedFromRanking.add(r.seat);
    }

    // §2.4.3–§2.4.7 unplayed-board credit.
    if (scoredAsAbsent) {
      withdrawals.push({
        seat: r.seat,
        treatment,
        finePercent: treatment === "PENALISED" ? r.finePercent ?? 0 : 0,
      });
    }
  }

  return { excludedFromRanking, withdrawals };
}

/**
 * EBU White Book §2.4.9 "without standing" — the set of participant ids whose
 * results count for their opponents but who are themselves dropped from the
 * ranking. See {@link resolveStandings} for the full rule (incl. the §2.4.7
 * LATE half-boards gate); this is the convenience reader that loads the rows
 * and board context and returns just the exclusion set.
 */
export async function readRankingExclusions(
  db: Db,
  boardRows: readonly StandingBoardRow[],
): Promise<Set<string>> {
  const rows = await readParticipantStandings(db);
  return resolveStandings(rows, boardRows).excludedFromRanking;
}

/**
 * Read the §2.4.3–§2.4.7 withdrawal records (incl. short LATE arrivals) for a
 * game — the convenience reader over {@link resolveStandings}.
 */
export async function readWithdrawals(
  db: Db,
  boardRows: readonly StandingBoardRow[],
): Promise<WithdrawalRecord[]> {
  const rows = await readParticipantStandings(db);
  return resolveStandings(rows, boardRows).withdrawals;
}
