import { ImpVpPool, impVpWinner } from "@/scoring/swiss/imp-vp-table";

/**
 * Voided / unplayable teams matches — EBU White Book §3.3.6 & §3.3.9.
 *
 * When a whole teams match is void (incorrect seating that can't be replayed,
 * or less than half the match could be played) the margin→VP conversion no
 * longer applies: each team is credited a RULING VP directly. The director
 * records the cause; this model turns a cause into the per-team VP.
 *
 * Two void scorings:
 *
 * - **§3.3.6.1 — whole match void (incorrect seating):** both teams get 40% of
 *   the pool (8 on the 20-VP scale). If the TD caused the error, both get the
 *   converse 60% (12/20). This is a FLAT per-team VP, cause-only (no board
 *   count).
 *
 * - **§3.3.9 — void because < half could be played:** AVE+ to the non-offending
 *   side and AVE− to the offending side on half the boards (rounded up), and
 *   AVE/AVE on the rest. In teams IMPs an AVE+ / AVE− board is ±3 IMPs, so the
 *   non-offending side's indemnity is `3 × ⌈N/2⌉` IMPs over `N` boards; each
 *   side's VP is then read off the N-board scale INDEPENDENTLY (so both-at-fault
 *   gives both teams a below-average VP — which a single margin cannot express).
 *
 * The cause is recorded relative to the match's HOME team (the lower-table
 * side), so `OFFENDER_NS` means the home team offended.
 *
 * The encoding is a token written to every board row of the voided match
 * (`directorOverrideResult`), recognised only on rows whose status is
 * `VOID_MATCH`. Kept outside the pairs adjusted-score and teams-removal
 * encodings.
 */

/**
 * How a voided match is scored, chosen by the director:
 *
 * - `SEATING_*` — §3.3.6.1 whole-match void (incorrect seating / can't replay):
 *   a FLAT per-team VP. `SEATING_STANDARD` → both 40%; `SEATING_TD` → both 60%
 *   (the TD-at-fault converse).
 * - `SHORT_*` — §3.3.9 void because less than half could be played: the
 *   AVE+/AVE− half-board split by who offended, read per-side off the N-board
 *   scale. The suffix is the offender (relative to the home/lower-table team).
 */
export type VoidCause =
  | "SEATING_STANDARD" // §3.3.6.1 — both teams 40%
  | "SEATING_TD" // §3.3.6.1 converse — both teams 60% (TD at fault)
  | "SHORT_OFFENDER_NS" // §3.3.9 — home offended → home AVE−, opp AVE+
  | "SHORT_OFFENDER_EW" // §3.3.9 — opponent offended → home AVE+, opp AVE−
  | "SHORT_BOTH" // §3.3.9 — both at fault → both AVE−
  | "SHORT_NEITHER"; // §3.3.9 — neither at fault → both AVE+

/** The fraction of the pool a team gets under the §3.3.6.1 flat void. */
const VOID_FLAT_FRACTION = 0.4; // 40% → 8/20
const VOID_FLAT_TD_FRACTION = 0.6; // TD at fault → converse 60% → 12/20

/** AVE+ / AVE− per removed board, in IMPs (the teams analogue, §3.3.9). */
const AVE_PLUS_IMPS = 3;

const PREFIX = "VOID:";

const CAUSES: readonly VoidCause[] = [
  "SEATING_STANDARD",
  "SEATING_TD",
  "SHORT_OFFENDER_NS",
  "SHORT_OFFENDER_EW",
  "SHORT_BOTH",
  "SHORT_NEITHER",
];

/** Build the stored token for a voided match, e.g. `VOID:OFFENDER_EW`. */
export function buildVoidMatch(cause: VoidCause): string {
  return `${PREFIX}${cause}`;
}

/** True if the outcome string is a void-match token. */
export function isVoidMatch(outcome: string): boolean {
  return parseVoidMatch(outcome) !== null;
}

/** Parse a void-match token into its cause, or null if not one. */
export function parseVoidMatch(outcome: string): VoidCause | null {
  if (!outcome.startsWith(PREFIX)) return null;
  const cause = outcome.slice(PREFIX.length) as VoidCause;
  return CAUSES.includes(cause) ? cause : null;
}

/** The VP each side receives for a voided match. Home = the lower-table team. */
export interface VoidMatchVp {
  home: number;
  opponent: number;
}

/**
 * §3.3.6.1 flat void VP: both teams 40% of the pool, or both 60% when the TD was
 * at fault. Independent of board count.
 */
export function voidFlatVp(pool: ImpVpPool, tdAtFault: boolean): VoidMatchVp {
  const fraction = tdAtFault ? VOID_FLAT_TD_FRACTION : VOID_FLAT_FRACTION;
  const vp = pool * fraction;
  return { home: vp, opponent: vp };
}

/**
 * §3.3.9 void VP: AVE+/AVE− on ⌈N/2⌉ boards, AVE/AVE on the rest, each side's
 * VP read INDEPENDENTLY off the N-board scale.
 *
 * A side's indemnity is `±AVE_PLUS_IMPS × ⌈N/2⌉` IMPs (AVE+ positive, AVE−
 * negative, AVE/AVE 0 on the remaining boards). The VP is `impVpWinner(|imps|)`
 * for a positive total, `pool − impVpWinner(|imps|)` for a negative total, and
 * the midpoint for zero — the same signed-per-side reading cross-IMP uses.
 */
export function voidSplitVp(
  cause: VoidCause,
  boards: number,
  pool: ImpVpPool,
): VoidMatchVp {
  const halfBoards = Math.ceil(boards / 2);
  const indemnity = AVE_PLUS_IMPS * halfBoards;

  // Per-side signed IMP total under the §3.3.9 split.
  const nsImps = shortSideImps(cause, "NS", indemnity);
  const ewImps = shortSideImps(cause, "EW", indemnity);

  return {
    home: sidedVp(nsImps, boards, pool),
    opponent: sidedVp(ewImps, boards, pool),
  };
}

/** The signed indemnity IMPs for one side under a §3.3.9 (SHORT_*) void cause. */
function shortSideImps(
  cause: VoidCause,
  side: "NS" | "EW",
  indemnity: number,
): number {
  switch (cause) {
    case "SHORT_OFFENDER_NS":
      // Home (NS) offended: NS AVE−, EW AVE+.
      return side === "NS" ? -indemnity : indemnity;
    case "SHORT_OFFENDER_EW":
      return side === "EW" ? -indemnity : indemnity;
    case "SHORT_BOTH":
      return -indemnity; // both AVE−
    case "SHORT_NEITHER":
      return indemnity; // both AVE+
    /* v8 ignore next 3 -- SEATING_* never reach the split path (voidMatchVp
       routes them to the flat scoring); guard keeps the switch total. */
    default:
      return 0;
  }
}

/** A side's VP from its signed IMP total, read independently off the scale. */
function sidedVp(imps: number, boards: number, pool: ImpVpPool): number {
  if (imps === 0) return pool / 2;
  const winner = impVpWinner(Math.abs(imps), boards, pool);
  return imps > 0 ? winner : pool - winner;
}

/**
 * The per-team VP for a voided match, by the director's chosen cause:
 *
 * - `SEATING_STANDARD` → §3.3.6.1 flat 40% to both.
 * - `SEATING_TD` → §3.3.6.1 converse 60% to both.
 * - `SHORT_*` → §3.3.9 AVE+/AVE− half-board split over `boards` (the expected
 *   match length). If `boards` is unknown (0/undefined) a SHORT void falls back
 *   to the flat 40% (we cannot size the split without a board count).
 */
export function voidMatchVp(
  cause: VoidCause,
  pool: ImpVpPool,
  boards: number | undefined,
): VoidMatchVp {
  if (cause === "SEATING_STANDARD") return voidFlatVp(pool, false);
  if (cause === "SEATING_TD") return voidFlatVp(pool, true);
  // SHORT_* needs the board count for the half-split; without it, fall back to
  // the flat 40% rather than guessing a scale.
  if (!boards || boards <= 0) return voidFlatVp(pool, false);
  return voidSplitVp(cause, boards, pool);
}

/* ============================================================
   BOARD-A-MATCH / POINT-A-BOARD  (board-won units)
============================================================ */

/**
 * The §3.3.6/§3.3.9 void outcome for a BOARD-COMPARISON (BAM/PAB) teams match,
 * expressed in NATIVE board-won units (0..N boards won; a tie is half a board).
 * BAM/PAB rank on boards won, not VP, so a void credits each team a boards-won
 * total rather than a VP. Held in board units so the BAM (×1) / PAB (×2)
 * display scale applies uniformly, matching `BYE_WON_FRACTION`.
 */
export interface VoidMatchWon {
  /** Home team's boards won (of `boards`). */
  home: number;
  /** Opponent team's boards won (of `boards`). */
  opponent: number;
  /** Boards the void counts as "played" (the full match length). */
  boards: number;
}

/** AVE+ / AVE / AVE− as a fraction of a board (board-comparison units). */
const AVE_PLUS_FRACTION = 0.6;
const AVE_FRACTION = 0.5;
const AVE_MINUS_FRACTION = 0.4;

/**
 * §3.3.6.1 flat board-won void: both teams win 40% of the match's boards (60%
 * when the TD was at fault). Mirrors `voidFlatVp` in board units.
 */
function voidFlatWon(boards: number, tdAtFault: boolean): VoidMatchWon {
  const fraction = tdAtFault ? AVE_PLUS_FRACTION : AVE_MINUS_FRACTION;
  const won = fraction * boards;
  return { home: won, opponent: won, boards };
}

/**
 * §3.3.9 board-won void: AVE+/AVE− on ⌈N/2⌉ boards, AVE/AVE on the rest, in
 * board-won units. Each side's boards-won is the sum of its per-board
 * fractions: the offender side AVE− (0.4) on the half-boards, the non-offender
 * AVE+ (0.6), and AVE (0.5) on the remaining boards for both. This is the exact
 * per-board translation the odd-field compensation (`swiss-half-match.ts`)
 * uses, extended with the AVE− offender side.
 */
function voidSplitWon(cause: VoidCause, boards: number): VoidMatchWon {
  const half = Math.ceil(boards / 2);
  const rest = boards - half;

  const nsFraction = shortSideFraction(cause, "NS");
  const ewFraction = shortSideFraction(cause, "EW");

  // Half the boards at the fault fraction, the rest at AVE (0.5) for both.
  const home = nsFraction * half + AVE_FRACTION * rest;
  const opponent = ewFraction * half + AVE_FRACTION * rest;
  return { home, opponent, boards };
}

/** The per-board AVE+/AVE− fraction for one side under a §3.3.9 void cause. */
function shortSideFraction(cause: VoidCause, side: "NS" | "EW"): number {
  switch (cause) {
    case "SHORT_OFFENDER_NS":
      return side === "NS" ? AVE_MINUS_FRACTION : AVE_PLUS_FRACTION;
    case "SHORT_OFFENDER_EW":
      return side === "EW" ? AVE_MINUS_FRACTION : AVE_PLUS_FRACTION;
    case "SHORT_BOTH":
      return AVE_MINUS_FRACTION; // both AVE−
    case "SHORT_NEITHER":
      return AVE_PLUS_FRACTION; // both AVE+
    /* v8 ignore next 3 -- SEATING_* never reach the split path. */
    default:
      return AVE_FRACTION;
  }
}

/**
 * The per-team boards-won for a voided BAM/PAB match, by cause — the board-won
 * analogue of {@link voidMatchVp}. `SEATING_*` → flat 40%/60% of N; `SHORT_*` →
 * the §3.3.9 per-board half-split. Falls back to the flat 40% when the board
 * count is unknown.
 */
export function voidMatchWon(
  cause: VoidCause,
  boards: number | undefined,
): VoidMatchWon {
  const n = !boards || boards <= 0 ? 0 : boards;
  if (cause === "SEATING_STANDARD") return voidFlatWon(n, false);
  if (cause === "SEATING_TD") return voidFlatWon(n, true);
  if (n <= 0) return voidFlatWon(0, false);
  return voidSplitWon(cause, n);
}
