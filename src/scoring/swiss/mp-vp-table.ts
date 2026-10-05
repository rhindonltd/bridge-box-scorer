/**
 * EBU matchpoint → Victory-Point conversion TABLES for Swiss Pairs.
 *
 * A pair's VP for a match is read from its percentage of available match points
 * against a board-count-dependent threshold table — NOT a single fixed curve.
 * There are two pools:
 *   - 10-VP, for a "2 half matches" HALF (split 5-5 .. 10-0).
 *   - 20-VP, for a full/ordinary match (split 10-10 .. 20-0).
 *
 * Each table column is a board-count band; each row is a VP split whose printed
 * number is the TOP of that band ("% of available match points not exceeding").
 * A percentage EQUAL to a threshold stays in that (lower) band; the next band is
 * strictly greater.
 *
 * The lookup is from the WINNER side (pct >= 50): a pair at or above 50% reads
 * its winner VP directly; a pair below 50% mirrors — `pool - lookup(100 - pct)`
 * — so e.g. 40% on a full match scores `20 - vp(60%)`. Scoring stays independent
 * per pair (a pair's % is measured against the whole field), so two pairs' VPs
 * need not sum to the pool.
 *
 * Transcribed from the EBU tables (see docs/mp-vp-conversion-tables.txt). By
 * decision the full-match columns stop at 20-27 boards (the 28-39 and 40-55
 * columns are dropped) and the UI caps boards/round accordingly, so a half
 * (= floor(boardsPerRound / 2)) never exceeds the 10-13 column either.
 */

/** The VP pool a match is scored on: 10 for a half, 20 for a full match. */
export type VpPool = 10 | 20;

/**
 * One board-count band and its winner thresholds. `maxBoards` is the inclusive
 * upper board count for the band (the last band also acts as the clamp). The
 * `thresholds` are the "not exceeding" upper bounds for the winning side,
 * ordered from the dead-even split upward — one per winner VP from
 * (pool / 2) up to (pool - 1). A winner % above the last threshold is the
 * maximum split (pool - 0).
 */
interface VpBand {
  maxBoards: number;
  thresholds: number[];
}

/**
 * 10-VP (half-match) table. `thresholds[i]` is the top of the band that awards
 * winner VP `5 + i` (so index 0 → 5-5 up to index 4 → 9-1); above the last is
 * 10-0.
 *
 * Columns: <=2, 3, 4, 5-6, 7-9, 10-13 boards.
 */
const HALF_MATCH_BANDS: VpBand[] = [
  { maxBoards: 2, thresholds: [51.86, 55.7, 59.94, 65.12, 73.15] },
  { maxBoards: 3, thresholds: [51.59, 54.87, 58.48, 62.89, 69.75] },
  { maxBoards: 4, thresholds: [51.32, 54.03, 57.03, 60.7, 66.38] },
  { maxBoards: 6, thresholds: [51.09, 53.36, 55.86, 58.92, 63.66] },
  { maxBoards: 9, thresholds: [50.92, 52.81, 54.93, 57.45, 61.41] },
  { maxBoards: 13, thresholds: [50.77, 52.36, 54.1, 56.24, 59.56] },
];

/**
 * 20-VP (full-match) table. `thresholds[i]` is the top of the band that awards
 * winner VP `10 + i` (index 0 → 10-10 up to index 9 → 19-1); above the last is
 * 20-0.
 *
 * Columns: <=4, 5-6, 7-9, 10-13, 14-19, 20-27 boards.
 */
const FULL_MATCH_BANDS: VpBand[] = [
  {
    maxBoards: 4,
    thresholds: [
      50.92, 52.8, 54.71, 56.7, 58.8, 61.08, 63.63, 66.61, 70.36, 75.95,
    ],
  },
  {
    maxBoards: 6,
    thresholds: [
      50.78, 52.39, 54.02, 55.72, 57.51, 59.45, 61.62, 64.17, 67.37, 72.13,
    ],
  },
  {
    maxBoards: 9,
    thresholds: [
      50.65, 51.98, 53.33, 54.74, 56.23, 57.83, 59.64, 61.75, 64.4, 68.35,
    ],
  },
  {
    maxBoards: 13,
    thresholds: [
      50.54, 51.65, 52.78, 53.95, 55.19, 56.53, 58.04, 59.8, 62.01, 65.3,
    ],
  },
  {
    maxBoards: 19,
    thresholds: [
      50.45, 51.38, 52.32, 53.3, 54.34, 55.45, 56.71, 58.18, 60.03, 62.78,
    ],
  },
  {
    maxBoards: 27,
    thresholds: [
      50.38, 51.16, 51.94, 52.77, 53.63, 54.57, 55.62, 56.85, 58.4, 60.71,
    ],
  },
];

/** Pick the band whose `maxBoards` first covers `boards`; clamp to the last. */
function bandFor(bands: VpBand[], boards: number): VpBand {
  return bands.find((b) => boards <= b.maxBoards) ?? bands[bands.length - 1];
}

/**
 * The WINNER's VP for a side at `pct >= 50` of available match points over a
 * match of `boards` boards, on the given pool. The base split is `pool / 2`
 * (dead even); each threshold the pct clears adds one VP, up to `pool`.
 */
function winnerVp(pct: number, boards: number, pool: VpPool): number {
  const bands = pool === 10 ? HALF_MATCH_BANDS : FULL_MATCH_BANDS;
  const { thresholds } = bandFor(bands, boards);
  const base = pool / 2;

  // "Not exceeding": the pct stays in a band while pct <= threshold. The first
  // threshold not cleared fixes the VP; clearing all of them is the max split.
  for (let i = 0; i < thresholds.length; i++) {
    if (pct <= thresholds[i]) return base + i;
  }
  return pool;
}

/**
 * Convert a pair's percentage of available match points to its Victory Points
 * for a match of `boards` boards on the given `pool` (10 for a half, 20 for a
 * full match), using the EBU threshold tables.
 *
 * Independent per pair: a pair at/above 50% reads its winner VP directly; below
 * 50% it mirrors (`pool - winnerVp(100 - pct)`). The result is always a whole
 * integer in `[0, pool]`.
 */
export function mpVpFromPercent(
  pct: number,
  boards: number,
  pool: VpPool,
): number {
  if (pct < 0 || pct > 100) {
    throw new Error("Percentage must be between 0 and 100");
  }
  // Round to 2 dp first (standard tournament protocol), matching the tables'
  // precision so a value printed to 2 dp lands in the intended band.
  const x = Math.round(pct * 100) / 100;

  if (x >= 50) return winnerVp(x, boards, pool);
  return pool - winnerVp(100 - x, boards, pool);
}
