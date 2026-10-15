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
  /**
   * Whether to keep each pair's section in its NS/EW label. Pass true for a
   * multi-section game (so pairs stay distinguishable across sections) and
   * false for a single-section game (where the section is redundant). Defaults
   * to true. The NS/EW direction is always dropped — the column header shows it.
   */
  includeSection?: boolean;
};

/**
 * Renders a scored board using the per-board scoring plugin that produced it.
 * Plugin resolution replaces the previous per-scoring-type switch.
 */
export function Traveller({
  scoredBoard,
  highlightAssignmentId,
  includeSection = true,
}: Props) {
  const plugin = getPerBoardPlugin(scoredBoard.pluginId);

  return (
    <PerBoardTravellerView
      plugin={plugin}
      scored={scoredBoard.lines}
      highlightAssignmentId={highlightAssignmentId}
      includeSection={includeSection}
    />
  );
}
