import { AssignedPair, baseSeatOf } from "@/model/participants";

/**
 * Resolve a pair id to its two player display names ("First Last"). Falls back
 * to a single-element array with the raw id when the pair is not found.
 * Returned as plain strings so it stays within the framework-free ScoreTable
 * model (rendered as a multiline cell).
 *
 * A scored line's id can carry a handover `#<occupancyId>` suffix (a non-primary
 * seat occupant), while the participant roster is keyed by the bare seat, so
 * matching is done on the base seat. This keeps names resolving once results
 * exist rather than falling back to the raw id.
 */
export function pairNameLines(
  participants: AssignedPair[],
  pairId: string,
): string[] {
  const base = baseSeatOf(pairId);
  const pair = participants.find((p) => baseSeatOf(p.id) === base);
  if (!pair) return [pairId];

  return [
    `${pair.player1.firstName} ${pair.player1.lastName}`.trim(),
    `${pair.player2.firstName} ${pair.player2.lastName}`.trim(),
  ];
}
