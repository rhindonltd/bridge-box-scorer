import {
  RecommendedMovement,
  RecommendedMovementSpecRef,
} from "@/movement/recommendations/recommendation-types";
import { SelectedMovement } from "@/model/selected-movement";

/**
 * Pure domain helpers for the section movement picker: matching a
 * recommendation to the persisted selection, and grouping recommendations for
 * display. Kept out of the component so the picker stays presentational.
 */

/**
 * Whether a recommendation resolves to the same concrete movement as the
 * section's persisted selection.
 *
 * - Seeded (DB) specs match on their numeric id.
 * - Generated Mitchells match on the defining spec fields (size, rounds,
 *   boards-per-round, arrow switches, and the variant flag), which together
 *   uniquely identify the movement a recommendation produces.
 */
export function movementMatchesSelection(
  specRef: RecommendedMovementSpecRef,
  selected: SelectedMovement | null,
): boolean {
  if (!selected) return false;

  if (selected.source === "SPEC") {
    return specRef.source === "db" && specRef.id === selected.specId;
  }

  // Swiss is not a recommendation-card movement, so it never matches one.
  if (selected.source !== "MITCHELL") return false;

  if (specRef.source !== "generated") return false;

  const a = specRef.spec;
  const b = selected.mitchell;
  return (
    a.tables === b.tables &&
    a.rounds === b.rounds &&
    a.boardsPerRound === b.boardsPerRound &&
    (a.arrowSwitchRounds ?? 0) === (b.arrowSwitchRounds ?? 0) &&
    !!a.skip === !!b.skip &&
    !!a.shareAndRelay === !!b.shareAndRelay &&
    !!a.hesitation === !!b.hesitation &&
    !!a.web === !!b.web
  );
}

export interface MovementGroup {
  boardsPerPair: number;
  movements: RecommendedMovement[];
}

/**
 * Group recommendations by how many boards a pair plays, ascending. This is the
 * natural way a director compares options (session length).
 */
export function groupByBoardsPerPair(
  recommendations: RecommendedMovement[],
): MovementGroup[] {
  const byBoards = new Map<number, RecommendedMovement[]>();
  for (const movement of recommendations) {
    const existing = byBoards.get(movement.boardsPerPair);
    if (existing) {
      existing.push(movement);
    } else {
      byBoards.set(movement.boardsPerPair, [movement]);
    }
  }
  return Array.from(byBoards.entries())
    .sort(([a], [b]) => a - b)
    .map(([boardsPerPair, movements]) => ({ boardsPerPair, movements }));
}
