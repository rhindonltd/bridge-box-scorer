/**
 * Removed teams-match boards — EBU White Book §3.3.7.
 *
 * When part of a teams match cannot be played (and at least half the match
 * still can), each removed board is given an artificial adjusted score of
 * **+3 / −3 IMPs** instead of a real table comparison: the non-offending team
 * gets +3, the offending team −3. The director records which side (if any) was
 * at fault; this fault is stored on the board rows and read by the teams IMP
 * scorers to contribute a fixed per-board IMP swing to the match margin.
 *
 * The encoding is a token written to `directorOverrideResult` (alongside the
 * `A<ns>/<ew>` and `W…` encodings), recognised only on rows whose status is
 * `REMOVED_TEAMS`. It is kept OUTSIDE the pairs adjusted-score encodings so the
 * pairs scorers never mistake it for a playable/assigned result.
 *
 * Fault is expressed relative to the two SEATS of the board row (NS vs EW),
 * which the teams scorer resolves to the two teams: on a match's home row the
 * NS seat is the home team, so `NS_FAULT` there means the home team was at
 * fault.
 */

export type TeamsRemovalFault =
  | "EW_FAULT" // East/West (the NS row's opponents) at fault → NS +3, EW −3
  | "NS_FAULT" // North/South at fault → NS −3, EW +3
  | "BOTH_FAULT" // both at fault → NS −3, EW −3 (each computed separately)
  | "NEITHER_FAULT"; // no side at fault / outside agency → NS +3, EW +3

/** The fixed IMP award per removed board (§3.3.7). */
export const REMOVED_BOARD_IMPS = 3;

const PREFIX = "TRM:";

const FAULTS: readonly TeamsRemovalFault[] = [
  "EW_FAULT",
  "NS_FAULT",
  "BOTH_FAULT",
  "NEITHER_FAULT",
];

/** Build the stored token for a removed teams board, e.g. `TRM:EW_FAULT`. */
export function buildRemovedTeamsBoard(fault: TeamsRemovalFault): string {
  return `${PREFIX}${fault}`;
}

/** True if the outcome string is a removed-teams-board token. */
export function isRemovedTeamsBoard(outcome: string): boolean {
  return parseRemovedTeamsBoard(outcome) !== null;
}

/** Parse a removed-teams-board token into its fault, or null if not one. */
export function parseRemovedTeamsBoard(
  outcome: string,
): TeamsRemovalFault | null {
  if (!outcome.startsWith(PREFIX)) return null;
  const fault = outcome.slice(PREFIX.length) as TeamsRemovalFault;
  return FAULTS.includes(fault) ? fault : null;
}

/**
 * The IMP swing a removed board contributes to the match margin, from the
 * perspective of the NS seat of the row carrying the fault (on a match's home
 * row that is the home team). Positive favours NS, negative favours EW.
 *
 * - `EW_FAULT` → +3 (NS indemnified, EW penalised)
 * - `NS_FAULT` → −3 (NS penalised, EW indemnified)
 * - `NEITHER_FAULT` → 0 (both get +3; net zero to the margin)
 * - `BOTH_FAULT` → 0 (both get −3; net zero to the margin)
 *
 * LIMITATION: the match margin is a single zero-sum figure, so `NEITHER_FAULT`
 * (both indemnified +3/+3) and `BOTH_FAULT` (both penalised −3/−3) are
 * indistinguishable here — both net to a 0 swing. The difference only affects
 * each team's ABSOLUTE result, which a margin-to-VP conversion cannot carry.
 * Representing that faithfully needs per-side VP overrides, which belong to the
 * §3.3.6 / §3.3.9 whole-match void work (deferred). The stored fault token
 * preserves the director's choice so that later work can honour it exactly.
 */
export function removedBoardNsSwing(fault: TeamsRemovalFault): number {
  switch (fault) {
    case "EW_FAULT":
      return REMOVED_BOARD_IMPS;
    case "NS_FAULT":
      return -REMOVED_BOARD_IMPS;
    case "NEITHER_FAULT":
    case "BOTH_FAULT":
      return 0;
  }
}
