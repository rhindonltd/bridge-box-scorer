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
}: Props) {
  return (
    <PluginViewSwitcher
      views={plugin.views}
      renderView={(view) => (
        <ScoreTableView
          table={view.toTable(lines, participants, { highlightAssignmentId })}
          highlightAssignmentId={highlightAssignmentId}
          rowTestId="leaderboard-row"
          splitColumns={splitColumns}
        />
      )}
    />
  );
}
