import type { MatchKind } from "@/model/game-types";

/**
 * A movement planned out table by table and round by round: what the movement
 * catalog and the Swiss draw produce, and what the core writes into a game's
 * database (`services/materialize-movement.ts`).
 */

/**
 * How a {@link PlannedRound}'s boards group into a first-class match,
 * supplied by the materialiser (which knows the real structure) so the generic
 * row builder never has to RE-INFER it. All fields but `kind`/`scoredAsUnit`
 * are optional; when a round carries no descriptor the builder synthesises a
 * default ordinary-pairs match (one match per table-round seating).
 *
 * `key` is a stable per-section grouping key: all rounds sharing a `key` within
 * a section belong to the SAME match row (so a teams triple comparison's two
 * rooms, or any multi-room encounter, collapse into one match). When omitted,
 * the builder keys the match by the round's own `(table, round, ns, ew)`.
 */
export interface MatchDescriptor {
  kind: MatchKind;
  scoredAsUnit: boolean;
  /** Stable grouping key within a section; defaults to the round's own seat. */
  key?: string;
  /** Match participants (home-seat ids, pre section-qualification). */
  home?: string;
  opponent?: string | null;
  groupId?: string | null;
  slot?: number | null;
  vpPool?: number | null;
  boardStart?: number;
  boardEnd?: number;
  /**
   * The match's round number, when it differs from this room's. A stored teams
   * movement can play a match's two rooms in different rounds, so its match is
   * numbered by its board set instead (each team plays each set once).
   */
  roundNumber?: number;
}

/**
 * One table's seating and boards for one round of a planned movement. Besides
 * who sits where and which boards are played, it can mark the (table, round) as
 * the dormant position of a one-pair-short session (`sitOut`: its boards are
 * written with status SIT_OUT and the pair scheduled there sits the round out).
 */
export interface PlannedRound {
  roundNumber: number;
  ns: string;
  ew: string;
  boardStart: number;
  boardEnd: number;
  /**
   * The first-class match these boards belong to. Optional: when absent the
   * row builder synthesises an ordinary {@link MatchKind} `PAIRS` match
   * (`scoredAsUnit: false`) keyed by this round's `(table, round, ns, ew)` —
   * the right default for a static matchpoint/XIMP pairs movement. Swiss and
   * teams materialisers supply an explicit descriptor.
   */
  match?: MatchDescriptor;
  sitOut?: boolean;
  /**
   * When true, this (table, round) is the compensated (unplayed) half of a
   * Swiss Pairs "2 half matches" group: its boards are written with status
   * HALF_AVERAGE (never played or submittable) and the half-match scorer
   * recomputes the AVE+/AVE credit across them. `ns` is the non-anchor pair
   * being compensated; `ew` is a phantom. Mutually exclusive with `sitOut`.
   */
  halfAverage?: boolean;
  /**
   * Physical duplicate copy of the board set (Web Mitchell only). Optional in
   * this in-memory shape; every persisted board row still gets a definite copy
   * because the boards.copy column defaults to "A".
   */
  boardCopy?: string;
}

export interface PlannedTable {
  tableNumber: number;
  rounds: PlannedRound[];
}

export type MovementPlan = PlannedTable[];
