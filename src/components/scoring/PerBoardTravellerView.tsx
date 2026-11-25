"use client";

import { ScoreTableView } from "@/components/scoring/ScoreTableView";
import { PluginViewSwitcher } from "@/components/scoring/PluginViewSwitcher";
import type { TableView } from "@/modules/results-views";

type Props<T> = {
  views: TableView<T>[];
  scored: T;
  highlightAssignmentId?: string;
  hideSection?: boolean;
};

/**
 * Renders a per-board scored traveller through its views. The view-selection
 * UI (single view vs. two-view Toggle) lives in the shared PluginViewSwitcher;
 * this component just renders each view's table through the shared
 * ScoreTableView.
 */
export function PerBoardTravellerView<T>({
  views,
  scored,
  highlightAssignmentId,
  hideSection,
}: Props<T>) {
  return (
    <PluginViewSwitcher
      views={views}
      renderView={(view) => (
        <ScoreTableView
          table={view.toTable(scored, { highlightAssignmentId, hideSection })}
          highlightAssignmentId={highlightAssignmentId}
        />
      )}
    />
  );
}
