"use client";

import { ScoreTableView } from "@/components/scoring/ScoreTableView";
import { PluginViewSwitcher } from "@/components/scoring/PluginViewSwitcher";
import { OverallScoringPlugin } from "@/scoring/plugins/types";
import { AssignedPair } from "@/model/participants";

type Props = {
  plugin: OverallScoringPlugin<unknown, unknown>;
  lines: unknown;
  participants: AssignedPair[];
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
   * Render the plugin view with this id and hide the in-screen toggle. The
   * room display uses this to honour the MP/% choice made on the preceding
   * screen. Ignored when no view matches.
   */
  selectedViewId?: string;
};

/**
 * Renders an overall (leaderboard) scoring result using a scoring plugin's
 * views. The single-view vs. two-view Toggle scaffolding lives in the shared
 * PluginViewSwitcher; this component just renders each view's leaderboard table.
 */
export function OverallLeaderboardView({
  plugin,
  lines,
  participants,
  highlightAssignmentId,
  splitColumns,
  scroll,
  selectedViewId,
}: Props) {
  return (
    <PluginViewSwitcher
      views={plugin.views}
      selectedViewId={selectedViewId}
      renderView={(view) => (
        <ScoreTableView
          table={view.toTable(lines, participants, { highlightAssignmentId })}
          highlightAssignmentId={highlightAssignmentId}
          rowTestId="leaderboard-row"
          splitColumns={splitColumns}
          scroll={scroll}
        />
      )}
    />
  );
}
