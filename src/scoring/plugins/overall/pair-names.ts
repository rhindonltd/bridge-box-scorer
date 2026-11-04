import { AssignedPair } from "@/model/participants";

/**
 * Resolve a pair id to its two player display names ("First Last"). Falls back
 * to a single-element array with the raw id when the pair is not found.
 * Returned as plain strings so it stays within the framework-free ScoreTable
 * model (rendered as a multiline cell).
 */
export function pairNameLines(
  participants: AssignedPair[],
  pairId: string,
): string[] {
  const pair = participants.find((p) => p.id === pairId);
  if (!pair) return [pairId];

  // §2.4.7 one-line handover DUAL-NAMING: when the seat is a merged line the
  // participant carries both pairs' names stitched for the local leaderboard.
  if (pair.displayNameLines && pair.displayNameLines.length > 0) {
    return pair.displayNameLines;
  }

  return [
    `${pair.player1.firstName} ${pair.player1.lastName}`.trim(),
    `${pair.player2.firstName} ${pair.player2.lastName}`.trim(),
  ];
}
