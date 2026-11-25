/**
 * Voided / unplayable teams matches — EBU White Book §3.3.6 & §3.3.9.
 *
 * When a whole teams match is void (incorrect seating that can't be replayed,
 * or less than half the match could be played) the margin→VP conversion no
 * longer applies: each team is credited a RULING VP directly. The director
 * records the cause; this module stores and reads it. Turning a cause into
 * each team's VP or boards won is scoring (`scoring/swiss/team-match-void-score.ts`).
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
