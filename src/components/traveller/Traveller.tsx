import type { ScoredBoard } from "@/modules/scoring";
import { travellerViews } from "@/modules/results-views";
import { PerBoardTravellerView } from "@/components/scoring/PerBoardTravellerView";

type Props = {
  scoredBoard: ScoredBoard;
  /**
   * When set, the row(s) where this pair appears (as NS or EW) are highlighted.
   * This is the pair's assignment id.
   */
  highlightAssignmentId?: string;
  /** Drop the section prefix from the pair ids shown in the rows. */
  hideSection?: boolean;
};

/**
 * Renders a scored board with the traveller views for the scoring that
 * produced it.
 */
export function Traveller({
  scoredBoard,
  highlightAssignmentId,
  hideSection,
}: Props) {
  return (
    <PerBoardTravellerView
      views={travellerViews(scoredBoard)}
      scored={scoredBoard}
      highlightAssignmentId={highlightAssignmentId}
      hideSection={hideSection}
    />
  );
}
