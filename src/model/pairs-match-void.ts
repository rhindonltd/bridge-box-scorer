import { PairVoidFault } from "@/scoring/swiss/swiss-half-match";

/**
 * Voided Swiss-PAIRS matches — EBU White Book §3.3.8 / §3.3.9.
 *
 * Unlike a teams match (a self-contained head-to-head), a Swiss-pairs match is
 * scored by matchpointing/cross-IMP each pair against the WHOLE section field.
 * So a voided pairs match is handled per-pair: the match's rows are removed from
 * the field everyone else is scored against, and each affected pair is credited
 * an AVE+/AVE−/AVE blend over the match's boards (AVE+ to the non-offending
 * pair, AVE− to the offender, on half the boards rounded up; AVE on the rest) —
 * the §3.3.9 split, reusing the half-match compensation machinery extended with
 * an AVE− offender side.
 *
 * The fault is recorded PER PAIR (its own standing: AVE+/AVE−/AVE), stored as a
 * `VOIDP:<fault>` token in `directorOverrideResult` on that pair's rows,
 * recognised only on rows whose status is `VOID_PAIR`. Each pair's rows carry
 * its own token, so no NS/EW inversion is needed (contrast the teams `VOID:`
 * encoding, which is home-relative to the two-table match).
 */

const PREFIX = "VOIDP:";

/**
 * The director's chosen reason for voiding a pairs match, which fixes BOTH
 * seats' per-pair faults. A pairs match is one table (NS vs EW on the same
 * board rows), so the cause — not a single pair's fault — is what is stored on
 * the shared rows, and the scorer derives each seat's fault from it. Expressed
 * relative to the acted row's seats (NS = this table, EW = opponents):
 *
 * - `OFFENDER_NS` — NS at fault → NS AVE−, EW AVE+.
 * - `OFFENDER_EW` — EW at fault → NS AVE+, EW AVE−.
 * - `BOTH` — both at fault → both AVE−.
 * - `NEITHER` — neither at fault → both AVE+.
 */
export type PairsVoidCause =
  | "OFFENDER_NS"
  | "OFFENDER_EW"
  | "BOTH"
  | "NEITHER";

const CAUSES: readonly PairsVoidCause[] = [
  "OFFENDER_NS",
  "OFFENDER_EW",
  "BOTH",
  "NEITHER",
];

/** Build the stored token for a voided pairs match, e.g. `VOIDP:OFFENDER_EW`. */
export function buildPairVoid(cause: PairsVoidCause): string {
  return `${PREFIX}${cause}`;
}

/** True if the outcome string is a pairs void token. */
export function isPairVoid(outcome: string): boolean {
  return parsePairVoid(outcome) !== null;
}

/** Parse a pairs void token into its cause, or null if not one. */
export function parsePairVoid(outcome: string): PairsVoidCause | null {
  if (!outcome.startsWith(PREFIX)) return null;
  const cause = outcome.slice(PREFIX.length) as PairsVoidCause;
  return CAUSES.includes(cause) ? cause : null;
}

/** The per-seat faults a cause assigns to the (NS, EW) pairs of the match. */
export function pairVoidFaults(cause: PairsVoidCause): {
  ns: PairVoidFault;
  ew: PairVoidFault;
} {
  switch (cause) {
    case "OFFENDER_NS":
      return { ns: "AVE_MINUS", ew: "AVE_PLUS" };
    case "OFFENDER_EW":
      return { ns: "AVE_PLUS", ew: "AVE_MINUS" };
    case "BOTH":
      return { ns: "AVE_MINUS", ew: "AVE_MINUS" };
    case "NEITHER":
      return { ns: "AVE_PLUS", ew: "AVE_PLUS" };
  }
}
