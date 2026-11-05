import { Db } from "@/db/games";
import {
  readSeatOccupancies,
  scoredIdByOccupancyId,
  inheritStandInOccupancyIds,
} from "@/db/games/queries/seat-occupancy";

/**
 * The minimal participant lifecycle row the standing resolver needs. Kept
 * structural so the resolver (`resolveStandings`) is a pure function unit tests
 * can drive with plain objects.
 */
export interface ParticipantStandingRow {
  seat: string;
  standing: "ACTIVE" | "WITHDRAWN" | "WITHOUT_STANDING" | "LATE";
  treatment:
    | "REMOVE"
    | "PENALISED"
    | "INHERIT"
    | "SUBSTITUTION"
    | "AVERAGE"
    | "REMOVED"
    | null;
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
  /**
   * §2.4.5 treatment chosen by the director. INHERIT is a §2.4.7 handover-only
   * treatment (the real pair takes the stand-in's actual board results); it
   * produces NO withdrawal/gap credit record — those boards score as real
   * results on the real pair's id — so a `WithdrawalRecord` is never emitted
   * with INHERIT. The variant is kept in the union only so the treatment type
   * flows uniformly from the standing rows.
   */
  treatment: "REMOVE" | "PENALISED" | "INHERIT";
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
  /**
   * §2.4.7 handover: the EXACT set of board numbers to score AVE− for this
   * contestant — the real pair's PRE-ARRIVAL (stand-in-played) boards. Used ONLY
   * for the arriving half of a stand-by → real-pair handover, where the
   * contestant's gap boards already carry the STAND-IN's result (so the ordinary
   * "no result on the row" test cannot find them). When set, the credit pass
   * awards the contestant AVE− on exactly these boards and does NOT indemnify
   * the opponent (the opponent already has a real result against the stand-in —
   * no board was lost to it). Absent for an ordinary withdrawal / empty-late
   * seat, which locate unplayed boards from the no-result rows.
   */
  unplayedBoards?: Set<number>;
}

/** Read every occupancy's lifecycle standing (seat + treatment + fine). */
export async function readParticipantStandings(
  db: Db,
): Promise<ParticipantStandingRow[]> {
  const occupancies = await readSeatOccupancies(db);
  // Key each occupancy's standing to its SCORED-FIELD id — the bare seat for an
  // ordinary occupant, `<seat>#<occId>` for a REMOVE/PENALISED handover stand-in.
  // This matches the id its board rows carry after the scoring-path rewrite, so
  // a stand-in's WITHOUT_STANDING no longer collides with the real pair's
  // standing on the shared seat (which would wrongly exclude the whole seat).
  const scoredIdById = scoredIdByOccupancyId(occupancies);

  // Under INHERIT the stand-in has NO scoring identity (its boards score as the
  // real pair's results on the shared bare id), so it would otherwise emit a
  // WITHOUT_STANDING standing row keyed to that shared id and wrongly exclude
  // the real pair. Drop those stand-in occupancies from the standings entirely.
  const inheritStandIns = inheritStandInOccupancyIds(occupancies);

  return occupancies
    .filter((o) => !inheritStandIns.has(o.id))
    .map((o) => ({
      seat: scoredIdById.get(o.id) ?? o.anchorId ?? o.seat,
      standing: o.standing,
      treatment: o.withdrawalTreatment,
      finePercent: o.withdrawalFinePercent,
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
      r.standing === "LATE" && !lateRetainsStanding(r.seat, playedBySeat, half);

    // §2.4.9 "without standing" is unconditional and treatment-independent: the
    // pair's results count for its opponents but it is never ranked. (Handled
    // before any treatment logic so it is unaffected by the INHERIT default.)
    if (r.standing === "WITHOUT_STANDING") {
      excludedFromRanking.add(r.seat);
      continue;
    }

    // Whether this contestant's UNPLAYED boards are scored per §2.4.6: every
    // WITHDRAWN pair, plus a short LATE arrival. Everyone else (ACTIVE, or a
    // LATE pair that retained standing) scores normally — nothing to do.
    const scoredAsAbsent = r.standing === "WITHDRAWN" || lateShort;
    if (!scoredAsAbsent) continue;

    // The treatment for the absent contestant's unplayed boards. An UNSET value
    // defaults to SUBSTITUTION — the §2.4.7 handover default. SUBSTITUTION and
    // INHERIT both mean those boards already carry real results on the pair's
    // own id (the scored-id resolver folds them onto the one line), so there is
    // nothing to score as absent: the pair is ranked on them like any other.
    // Skip it — neither excluded nor credited.
    const rawTreatment = r.treatment ?? "SUBSTITUTION";
    if (rawTreatment === "SUBSTITUTION" || rawTreatment === "INHERIT") continue;

    // A REMOVE / PENALISED absentee: REMOVE (drop from the ranking; opponents
    // still indemnified) or PENALISED (AVE− + fine).
    const treatment: "REMOVE" | "PENALISED" =
      rawTreatment === "PENALISED" ? "PENALISED" : "REMOVE";

    // §2.4.9 ranking exclusion for a REMOVE absentee.
    if (treatment === "REMOVE") {
      excludedFromRanking.add(r.seat);
    }

    // §2.4.3–§2.4.7 unplayed-board credit.
    withdrawals.push({
      seat: r.seat,
      treatment,
      finePercent: treatment === "PENALISED" ? (r.finePercent ?? 0) : 0,
    });
  }

  return { excludedFromRanking, withdrawals };
}
