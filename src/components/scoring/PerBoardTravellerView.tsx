"use client";

import { ScoreTableView } from "@/components/scoring/ScoreTableView";
import { PluginViewSwitcher } from "@/components/scoring/PluginViewSwitcher";
import { PerBoardScoringPlugin } from "@/scoring/plugins/types";

type Props = {
  plugin: PerBoardScoringPlugin<unknown>;
  scored: unknown;
  highlightAssignmentId?: string;
  hideSection?: boolean;
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
  hideSection,
}: Props) {
  return (
    <PluginViewSwitcher
      views={plugin.views}
      renderView={(view) => (
        <ScoreTableView
          table={view.toTable(scored, { highlightAssignmentId, hideSection })}
          highlightAssignmentId={highlightAssignmentId}
        />
      )}
    />
  );
}
