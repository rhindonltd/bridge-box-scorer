import { ScoredBoard } from "@/scoring/traveller/score-traveller";
import { PerBoardTravellerView } from "@/components/scoring/PerBoardTravellerView";
import { getPerBoardPlugin } from "@/scoring/plugins/registry";

type Props = {
  scoredBoard: ScoredBoard;
  /**
   * When set, the row(s) where this pair appears (as NS or EW) are highlighted.
   * This is the pair's assignment id.
   */
  highlightAssignmentId?: string;
};

/**
 * Renders a scored board using the per-board scoring plugin that produced it.
 * Plugin resolution replaces the previous per-scoring-type switch.
 */
export function Traveller({ scoredBoard, highlightAssignmentId }: Props) {
  const plugin = getPerBoardPlugin(scoredBoard.pluginId);

  return (
    <PerBoardTravellerView
      plugin={plugin}
      scored={scoredBoard.lines}
      highlightAssignmentId={highlightAssignmentId}
    />
  );
}
