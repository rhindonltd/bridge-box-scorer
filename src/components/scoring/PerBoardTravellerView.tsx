"use client";

import { ScoreTableView } from "@/components/scoring/ScoreTableView";
import { PluginViewSwitcher } from "@/components/scoring/PluginViewSwitcher";
import { PerBoardScoringPlugin } from "@/scoring/plugins/types";

type Props = {
  plugin: PerBoardScoringPlugin<unknown>;
  scored: unknown;
  highlightAssignmentId?: string;
  /** Keep each pair's section in its NS/EW label (multi-section games). */
  includeSection?: boolean;
};

/**
 * Renders a per-board scored traveller using a scoring plugin's views. The
 * view-selection UI (single view vs. two-view Toggle) lives in the shared
 * PluginViewSwitcher; this component just renders each view's table through the
 * shared ScoreTableView.
 */
export function PerBoardTravellerView({
  plugin,
  scored,
  highlightAssignmentId,
  includeSection = true,
}: Props) {
  return (
    <PluginViewSwitcher
      views={plugin.views}
      renderView={(view) => (
        <ScoreTableView
          table={view.toTable(scored, {
            highlightAssignmentId,
            includeSection,
          })}
          highlightAssignmentId={highlightAssignmentId}
        />
      )}
    />
  );
}
