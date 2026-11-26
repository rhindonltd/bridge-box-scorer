import type { OddHandling } from "./teams/swiss-teams-pairing";

/**
 * When the next Swiss round may be drawn, shared by Swiss Pairs and Swiss
 * Teams: the event must have rounds left, and the current round must be fully
 * scored. Pure; the one read (is a round complete?) is passed in, so it is made
 * only when the rule needs it.
 */

/** A board as the round-completion rule sees it. */
export interface RoundBoardState {
  status: string | null;
  /** A match-level void / mismatch ruling on the board's match, if any. */
  ruling: string | null;
}

/**
 * Which board statuses count as resolved when deciding whether a round is
 * complete, and which are dropped from the playable set first.
 */
export interface RoundCompletionPolicy {
  completeStatuses: readonly string[];
  ignoreStatuses: readonly string[];
}

/**
 * Swiss Pairs: a bye's SIT_OUT and a "2 half matches" HALF_AVERAGE block are
 * scorer-resolved and never submitted, so they are dropped from the playable
 * set rather than counted. A round of only those has nothing to draw from.
 * A fouled board (CANCELLED, carrying its §3.3.2 adjusted score) is final.
 */
export const PAIRS_ROUND_COMPLETION: RoundCompletionPolicy = {
  completeStatuses: ["CONFIRMED", "OVERRIDDEN", "CANCELLED", "REMOVED_TEAMS"],
  ignoreStatuses: ["SIT_OUT", "HALF_AVERAGE"],
};

/**
 * Swiss Teams: a bye's SIT_OUT boards are never played, so they count as
 * resolved (they don't block the next draw) rather than being dropped. Teams
 * has no HALF_AVERAGE compensation blocks.
 */
export const TEAMS_ROUND_COMPLETION: RoundCompletionPolicy = {
  completeStatuses: [
    "CONFIRMED",
    "OVERRIDDEN",
    "CANCELLED",
    "REMOVED_TEAMS",
    "SIT_OUT",
  ],
  ignoreStatuses: [],
};

/**
 * Whether a round is safe to draw the NEXT round from: every playable board
 * has a final status or its match carries a ruling (a voided / mismatched
 * match counts as resolved even if its boards were never played). An empty
 * round (no playable boards) is never complete: there is nothing to score
 * from. A null status is neither ignored nor complete, so it keeps the round
 * incomplete unless its match has a ruling.
 */
export function isSwissRoundFinal(
  boards: readonly RoundBoardState[],
  policy: RoundCompletionPolicy,
): boolean {
  const ignore = new Set<string>(policy.ignoreStatuses);
  const complete = new Set<string>(policy.completeStatuses);
  const playable = boards.filter(
    (b) => b.status == null || !ignore.has(b.status),
  );
  if (playable.length === 0) return false;
  return playable.every(
    (b) => (b.status != null && complete.has(b.status)) || b.ruling != null,
  );
}

/** Why the next round can't be drawn yet. */
export type SwissDrawGateRejection = "EVENT_COMPLETE" | "ROUND_INCOMPLETE";

/** The read the draw gate needs. */
export interface SwissDrawGateReads {
  /** Whether every playable board of the round has a final result. */
  isRoundComplete(roundNumber: number): Promise<boolean>;
}

/**
 * The round to draw next, or why none can be drawn: the event is complete once
 * its last round has been materialized, and the current round must be fully
 * scored first. Before round 1 there is nothing to check.
 *
 * @param currentRound  The highest round already materialized (0 before the
 *   first draw).
 */
export async function nextSwissDrawRound(
  currentRound: number,
  totalRounds: number,
  reads: SwissDrawGateReads,
): Promise<
  | { ok: true; nextRound: number }
  | { ok: false; reason: SwissDrawGateRejection }
> {
  if (currentRound >= totalRounds) return { ok: false, reason: "EVENT_COMPLETE" };
  if (currentRound >= 1 && !(await reads.isRoundComplete(currentRound))) {
    return { ok: false, reason: "ROUND_INCOMPLETE" };
  }
  return { ok: true, nextRound: currentRound + 1 };
}

/**
 * Whether a Swiss Teams field's odd team count can be resolved: a bye always
 * can, and a triple needs at least three teams to form the three-way.
 */
export function swissTeamsOddFieldRejection(
  teams: number,
  oddHandling: OddHandling,
): "ODD_TEAM_COUNT" | null {
  return teams % 2 !== 0 && oddHandling === "TRIPLE" && teams < 3
    ? "ODD_TEAM_COUNT"
    : null;
}
