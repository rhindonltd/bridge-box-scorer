import type { SelectedMovement } from "@/model/selected-movement";

/**
 * The score breaks a movement declares on top of the ones its matches give.
 * A team scores up wherever all its matches so far are finished (see
 * `scoreBreakRounds` in play-flow); a movement can also call a score-up in the
 * middle of a match. A head-to-head is one match over two stanzas, scored on
 * the IMPs of both together, with a score-up between the stanzas.
 *
 * Returns the rounds a score break follows, for every team in the section.
 */
export function declaredScoreBreakRounds(
  selected: SelectedMovement | null,
): number[] {
  return selected?.source === "HEAD_TO_HEAD_TEAMS" ? [1] : [];
}
