import { SwissVpBoardRow } from "./swiss-vp-overall";

/**
 * Shared structure + conversions for Swiss Pairs **"2 half matches"** rounds
 * (the odd-field handling where three pairs form a group: an **anchor** that
 * plays the full round split into two halves against two different opponents,
 * and two **non-anchors** that each play one half and are credited an
 * average-plus/average blend for the half they miss).
 *
 * This module owns only the *structural* half-match logic — splitting a pair's
 * round into half-segments, and the per-half VP conversions — so the two Swiss
 * Pairs VP scorers (`swiss-mp-vp-overall.ts`, `swiss-ximp-vp-overall.ts`) share
 * it without duplicating the rules. The actual per-board field scoring (match-
 * points vs cross-IMP) stays in each scorer: under the resolved model (Option
 * A, see `docs/swiss-pairs-half-matches-design.md` §4/Q-A) a half is scored
 * against the **whole section's field restricted to the half's board subset**,
 * exactly like a normal round — NOT an isolated two-pair head-to-head.
 *
 * The materialized board rows encode a half-match round as (see §4):
 *   - Half 1 real rows: `ns = anchor, ew = X` on board subset S1.
 *   - Half 2 real rows: `ns = anchor, ew = Y` on board subset S2.
 *   - Compensation:     `HALF_AVERAGE` rows `ns = non-anchor, ew = phantom`
 *                       on the boards that non-anchor missed.
 * so a pair's **segments** for the round are its rows grouped by the *other*
 * pair (its opponent), with every `HALF_AVERAGE` row forming one synthetic
 * "compensation" segment. The anchor has two real segments; each non-anchor has
 * one real + one compensation segment; an ordinary (non-half) round leaves a
 * pair with exactly one real segment and no compensation.
 */

/** The board status marking a non-anchor's unplayed (compensated) half. */
export const HALF_AVERAGE_STATUS = "HALF_AVERAGE";

/** Matchpoint average-plus award for a compensated board: 60% of the top. */
export const HALF_MATCH_MP_AVE_PLUS = 0.6;
/** Matchpoint average award for a compensated board: 50% of the top. */
export const HALF_MATCH_MP_AVE = 0.5;
/** Matchpoint average-minus award for a compensated board: 40% of the top. */
export const HALF_MATCH_MP_AVE_MINUS = 0.4;
/** Cross-IMP average-plus award for a compensated board: +2 IMP / comparison. */
export const HALF_MATCH_XIMP_AVE_PLUS = 2;
/** Cross-IMP average award for a compensated board: 0 IMP / comparison. */
export const HALF_MATCH_XIMP_AVE = 0;
/** Cross-IMP average-minus award for a compensated board: −2 IMP / comparison. */
export const HALF_MATCH_XIMP_AVE_MINUS = -2;

/**
 * How a pair's round splits into segments. A segment is identified by the
 * `opponent` pair id for a real (played) half, or the sentinel below for the
 * compensated (sat-out) half — one segment per distinct opponent, plus at most
 * one compensation segment.
 */
export const COMPENSATION_SEGMENT = "__HALF_AVERAGE__";

/** One of a pair's half-match segments for a round. */
export interface PairSegment<R extends SwissVpBoardRow> {
  /** The opposing pair id, or {@link COMPENSATION_SEGMENT} for the sat-out half. */
  opponent: string;
  /** True when this segment is the compensated (unplayed) half. */
  compensation: boolean;
  /** The pair's rows for this segment, in input order. */
  rows: R[];
}

/**
 * Group one pair's rows for a round into its half-match segments.
 *
 * Rows are bucketed by the *other* pair at the row (the opponent): for a row
 * where `pairId` sits NS the opponent is `ew`, and vice versa. Every
 * `HALF_AVERAGE` row (regardless of its phantom EW id) is collapsed into a
 * single {@link COMPENSATION_SEGMENT} bucket, because a non-anchor's missed half
 * has no real opponent. Segment order is stable: real segments first (in the
 * order their opponents are first seen), then the compensation segment.
 */
export function segmentsForPair<R extends SwissVpBoardRow>(
  pairId: string,
  rows: R[],
): PairSegment<R>[] {
  const bySegment = new Map<string, PairSegment<R>>();
  const order: string[] = [];

  for (const row of rows) {
    const isCompensation = row.status === HALF_AVERAGE_STATUS;
    const opponent = isCompensation
      ? COMPENSATION_SEGMENT
      : row.ns === pairId
        ? row.ew
        : row.ns;

    let segment = bySegment.get(opponent);
    if (!segment) {
      segment = { opponent, compensation: isCompensation, rows: [] };
      bySegment.set(opponent, segment);
      order.push(opponent);
    }
    segment.rows.push(row);
  }

  // Real segments first (first-seen order), then the compensation segment.
  return order
    .map((key) => bySegment.get(key)!)
    .sort((a, b) => Number(a.compensation) - Number(b.compensation));
}

/**
 * Whether a pair's segments describe a half-match round for that pair.
 *
 * A pair is in a half-match this round iff it has more than one segment (the
 * anchor, two real halves) OR any compensation segment (a non-anchor, one real
 * + one compensated half). A single real segment with no compensation is an
 * ordinary round, scored on the full 20-VP scale.
 */
export function isHalfMatchRound<R extends SwissVpBoardRow>(
  segments: PairSegment<R>[],
): boolean {
  return (
    segments.length > 1 || segments.some((segment) => segment.compensation)
  );
}

/**
 * Split a compensated half's `n` boards into the average-plus / average counts.
 * AVE+ is credited on `ceil(n / 2)` boards, AVE on the rest — so a 4-board
 * missed half is 2 AVE+ / 2 AVE, and a 3-board missed half is 2 AVE+ / 1 AVE.
 */
export function compensationSplit(boards: number): {
  avePlus: number;
  ave: number;
} {
  const avePlus = Math.ceil(boards / 2);
  return { avePlus, ave: boards - avePlus };
}

/**
 * The per-board matchpoint fraction (0–1 of the board top) each board of a
 * compensated half earns, as an array of length `boards`: the first
 * `ceil(n/2)` boards at AVE+ (0.6) and the rest at AVE (0.5). The scorer
 * multiplies each by that board's `maxMatchPoints` (the field top) so the
 * compensated half is matchpointed on the same scale as the real halves.
 */
export function compensationMpFractions(boards: number): number[] {
  const { avePlus } = compensationSplit(boards);
  return Array.from({ length: Math.max(boards, 0) }, (_, i) =>
    i < avePlus ? HALF_MATCH_MP_AVE_PLUS : HALF_MATCH_MP_AVE,
  );
}

/**
 * The per-board cross-IMP credit, **in IMP per comparison**, each board of a
 * compensated half earns, as an array of length `boards`: the first `ceil(n/2)`
 * boards at AVE+ (+2) and the rest at AVE (0). The scorer multiplies each by
 * that board's comparison count (`r − 1`) to get the raw cross-IMP, then
 * normalises by the board's `sqrt(r·c/2)` factor so the compensated half's
 * XIMPQ is on the same scale as a real half.
 */
export function compensationXimpPerComparison(boards: number): number[] {
  const { avePlus } = compensationSplit(boards);
  return Array.from({ length: Math.max(boards, 0) }, (_, i) =>
    i < avePlus ? HALF_MATCH_XIMP_AVE_PLUS : HALF_MATCH_XIMP_AVE,
  );
}


/* ============================================================
   §3.3.9 VOID-MATCH COMPENSATION (per-pair, with an AVE− offender side)

   A voided Swiss-pairs match (§3.3.8 / §3.3.9) credits each affected pair an
   AVE+/AVE−/AVE blend over the match's `boards`: AVE+ (non-offender) or AVE−
   (offender) on the first ⌈boards/2⌉, AVE on the rest; a pair neither helped
   nor penalised is AVE throughout. This extends the half-match compensation
   with the AVE− side the benign (bye) compensation never needed.
============================================================ */

/** A voided pair's standing on the §3.3.9 half-board split. */
export type PairVoidFault = "AVE_PLUS" | "AVE_MINUS" | "AVE";

/**
 * The per-board matchpoint fraction (0–1 of top) a voided pair earns over
 * `boards`: for AVE_PLUS, the first ⌈boards/2⌉ at 0.6 and the rest at 0.5; for
 * AVE_MINUS, the first ⌈boards/2⌉ at 0.4 and the rest at 0.5; for AVE, 0.5
 * throughout. Mirrors {@link compensationMpFractions} with the offender side.
 */
export function voidMpFractions(
  boards: number,
  fault: PairVoidFault,
): number[] {
  const { avePlus: half } = compensationSplit(boards);
  const splitValue =
    fault === "AVE_PLUS"
      ? HALF_MATCH_MP_AVE_PLUS
      : fault === "AVE_MINUS"
        ? HALF_MATCH_MP_AVE_MINUS
        : HALF_MATCH_MP_AVE;
  return Array.from({ length: Math.max(boards, 0) }, (_, i) =>
    i < half ? splitValue : HALF_MATCH_MP_AVE,
  );
}

/**
 * The per-board cross-IMP credit (IMP per comparison) a voided pair earns over
 * `boards`: AVE_PLUS → first ⌈boards/2⌉ at +2, rest 0; AVE_MINUS → first
 * ⌈boards/2⌉ at −2, rest 0; AVE → 0 throughout. Mirrors
 * {@link compensationXimpPerComparison} with the offender side.
 */
export function voidXimpPerComparison(
  boards: number,
  fault: PairVoidFault,
): number[] {
  const { avePlus: half } = compensationSplit(boards);
  const splitValue =
    fault === "AVE_PLUS"
      ? HALF_MATCH_XIMP_AVE_PLUS
      : fault === "AVE_MINUS"
        ? HALF_MATCH_XIMP_AVE_MINUS
        : HALF_MATCH_XIMP_AVE;
  return Array.from({ length: Math.max(boards, 0) }, (_, i) =>
    i < half ? splitValue : HALF_MATCH_XIMP_AVE,
  );
}
