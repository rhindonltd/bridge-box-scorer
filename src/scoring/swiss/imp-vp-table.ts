/**
 * IMP → Victory-Point DISCRETE scale, ported verbatim from the EBU's own
 * generator (https://www.ebu.co.uk/dynamic/js/vps.js), which produces the
 * published EBU White Book VP tables.
 *
 * The discrete scale is NOT `round(continuous WBF VP)`. The EBU builds each
 * band boundary by INVERTING the continuous VP curve at the half-integer VP
 * values (10.5, 11.5, …) to find the IMP margin where the band ends, flooring
 * the result, then applying a concavity-correction pass (`discreteCC`). This
 * module ports that exactly, so our integer VP matches the EBU tables for every
 * board count (verified against the full 20-VP table and the 10-VP half table).
 *
 * Two pools:
 *  - 20-VP full match (split 10-10 … 20-0): `discrete(boards, 10)`.
 *  - 10-VP half / triangular match (split 5-5 … 10-0): `discrete(H / 2, 5)`,
 *    where H is the half's board count — the EBU "triangular" indexing.
 *
 * The band boundaries are the WINNER side (>= half the pool); the loser takes
 * `pool - winnerVP`. A pair/team scored INDEPENDENTLY (Swiss Pairs cross-IMP)
 * reads its own signed IMP total: a positive total gets the winner VP, a
 * negative total the mirror below the midpoint, zero the dead-even midpoint.
 */

/** The VP pool a match is scored on: 10 for a half, 20 for a full match. */
export type ImpVpPool = 10 | 20;

/** r = τ³ where τ is the golden ratio — the EBU curve's decay constant. */
const R = Math.pow(0.5 * (Math.sqrt(5) - 1), 3);

/**
 * The inverse of the EBU continuous VP map: given a VP value `v` on a pool of
 * `2*v0` (so `v0` is the midpoint, 10 or 5) over a match whose blitz point is
 * `x`, return the IMP margin at which the continuous curve reaches `v`. Ported
 * verbatim from vps.js `imap`.
 */
function imap(v: number, v0: number, x: number): number {
  return x * (Math.log(1 - (1 - R) * (v / v0 - 1)) / Math.log(R));
}

/**
 * The raw discrete band upper-bounds for one pool, ported verbatim from vps.js
 * `discrete`. `mid` is the pool midpoint (10 for the 20-VP scale, 5 for the
 * 10-VP scale); `boards` is the EBU board argument (the match boards for the
 * full scale, H/2 for the triangular half scale).
 *
 * Returns `mid` entries: `out[i]` is the largest IMP margin still awarding
 * winner VP `mid + i` (i = 0 is the dead-even band, up to i = mid-1 just below
 * the max). A margin above `out[mid-1]` is the maximum split (`2*mid`-0).
 */
function discrete(boards: number, mid: number): number[] {
  const out: number[] = [];
  const blitz = 15 * Math.sqrt(boards);
  for (let v = 0; v < mid; v++) {
    out[v] = Math.floor(imap(mid + 0.5 + v, mid, blitz));
  }
  return out;
}

/**
 * The EBU concavity-correction pass, ported verbatim from vps.js `discreteCC`.
 * Standard flooring can leave a band wider than an earlier one (an extra IMP
 * worth more VP than a previous IMP); this walks the boundaries and pulls them
 * in until each successive band is no wider than the previous, restoring the
 * monotone-concave shape bridge VP scales require.
 */
function discreteCC(v: number[]): number[] {
  let i = 0;
  while (i < 9) {
    if (i === 0) {
      if (v[1] - v[0] < v[0] * 2 + 1) {
        v[0]--;
        i = -1;
      }
    } else {
      if (v[i + 1] - v[i] < v[i] - v[i - 1]) {
        v[i]--;
        i = -1;
      }
    }
    i++;
  }
  return v;
}

/**
 * The EBU board argument for a pool: the match's board count for the 20-VP full
 * scale, or H/2 for the 10-VP triangular half scale (H = the half's boards).
 */
function boardArg(boards: number, pool: ImpVpPool): number {
  return pool === 20 ? boards : boards / 2;
}

/**
 * Band upper-bounds for a (boards, pool), memoised — building them runs the
 * EBU inversion + concavity pass, which is pure and depends only on these two
 * inputs. `uppers[i]` is the top IMP margin awarding winner VP `mid + i`.
 */
const cache = new Map<string, number[]>();
function bandUppers(boards: number, pool: ImpVpPool): number[] {
  const key = `${pool}:${boards}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const mid = pool / 2;
  const uppers = discreteCC(discrete(boardArg(boards, pool), mid));
  cache.set(key, uppers);
  return uppers;
}

/**
 * The WINNER's discrete VP for a (non-negative) IMP `margin` over a match of
 * `boards` boards on the given pool. The dead-even band awards the midpoint
 * (`pool / 2`); each band the margin clears adds one VP, up to `pool`.
 */
export function impVpWinner(
  margin: number,
  boards: number,
  pool: ImpVpPool,
): number {
  const mid = pool / 2;
  const uppers = bandUppers(boards, pool);
  // uppers[i] is the top margin for winner VP (mid + i). Find the first band
  // the margin does NOT exceed; clearing all of them is the max split.
  for (let i = 0; i < uppers.length; i++) {
    if (margin <= uppers[i]) return mid + i;
  }
  return pool;
}

/**
 * The discrete VP for a side with a SIGNED IMP result over a match of `boards`
 * boards on the given pool. Independent per side (Swiss Pairs cross-IMP): a
 * positive result gets the winner VP, a negative result the mirror below the
 * midpoint (`pool - winnerVP(|imps|)`), zero the dead-even midpoint.
 */
export function impVpSided(
  imps: number,
  boards: number,
  pool: ImpVpPool,
): number {
  if (imps === 0) return pool / 2;
  const winner = impVpWinner(Math.abs(imps), boards, pool);
  return imps > 0 ? winner : pool - winner;
}
