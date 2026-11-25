import type { PairSeat } from "@/model/participants";

/**
 * The director's decisions about who stands in the ranking: seat occupancies,
 * each seat's standing, and the withdrawal records the scoring passes use.
 * Plain types shared by the core and the rulings and scoring code.
 */

/**
 * The scoring-relevant columns of a seat occupancy (the `seat_occupancy`
 * table). Player ids and the seat's secret key are left out on purpose: no
 * pure code needs them, and the secret must not travel beyond the database
 * layer.
 */
export interface OccupancyRecord {
  id: number;
  seat: PairSeat;
  anchorId: string | null;
  boards: number[] | null;
  standing: "ACTIVE" | "WITHDRAWN" | "WITHOUT_STANDING" | "LATE";
  withdrawnInRound: number | null;
  withdrawalTreatment: "REMOVE" | "PENALISED" | "AVERAGE" | "REMOVED" | null;
  withdrawalFinePercent: number | null;
  isArrivalAnchor: number;
  isMainLine: number;
  split: number;
}

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
