"use client";

import { ScoreTableView } from "@/components/scoring/ScoreTableView";
import { PluginViewSwitcher } from "@/components/scoring/PluginViewSwitcher";
import type { TableView } from "@/modules/results-views";

type Props<T> = {
  views: TableView<T>[];
  standings: T;
  highlightAssignmentId?: string;
  /** Spread the standings across this many side-by-side columns (default 1). */
  splitColumns?: number;
  /**
   * Whether the leaderboard table owns its own scroll region (default true).
   * The room display passes false so its own auto-scroll container owns
   * scrolling and the table's sticky header pins to that outer region.
   */
  scroll?: boolean;
  /**
   * Render the view with this id and hide the in-screen toggle. The room
   * display uses this to honour the MP/% choice made on the preceding screen.
   * Ignored when no view matches.
   */
  selectedViewId?: string;
  /**
   * Whether cells may be interactive (default true). The passive room display
   * passes false so a team name shows as static text rather than a button.
   */
  interactive?: boolean;
};

/**
 * Renders a set of standings through its leaderboard views. The single-view
 * vs. two-view Toggle scaffolding lives in the shared PluginViewSwitcher; this
 * component just renders each view's leaderboard table.
 */
export function OverallLeaderboardView<T>({
  views,
  standings,
  highlightAssignmentId,
  splitColumns,
  scroll,
  selectedViewId,
  interactive,
}: Props<T>) {
  return (
    <PluginViewSwitcher
      views={views}
      selectedViewId={selectedViewId}
      renderView={(view) => (
        <ScoreTableView
          table={view.toTable(standings, { highlightAssignmentId })}
          highlightAssignmentId={highlightAssignmentId}
          rowTestId="leaderboard-row"
          splitColumns={splitColumns}
          scroll={scroll}
          interactive={interactive}
        />
      )}
    />
  );
}
