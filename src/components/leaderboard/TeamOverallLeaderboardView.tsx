"use client";

import { ScoreTableView } from "@/components/scoring/ScoreTableView";
import { PluginViewSwitcher } from "@/components/scoring/PluginViewSwitcher";
import { getTeamOverallPlugin } from "@/scoring/plugins/team-overall/registry";
import {
  TeamOverallScoreOf,
  TeamOverallScoreType,
} from "@/scoring/plugins/team-overall/types";
import { AssignedTeam } from "@/model/participants";

type Props<T extends TeamOverallScoreType> = {
  score: TeamOverallScoreOf<T>;
  teams: AssignedTeam[];
  highlightAssignmentId?: string;
  /** Spread the standings across this many side-by-side columns (default 1). */
  splitColumns?: number;
  /**
   * Whether the standings table owns its own scroll region (default true). The
   * room display passes false so its own auto-scroll container owns scrolling.
   */
  scroll?: boolean;
  /**
   * Whether cells may be interactive (default true). The passive room display
   * passes false so a team name shows as static text rather than a button.
   */
  interactive?: boolean;
};

/**
 * Renders a team overall standing (Swiss VP, aggregate IMPs, Board-a-Match or
 * Point-a-Board) via the team overall display registry. The teams counterpart
 * to {@link import("@/components/scoring/OverallLeaderboardView").OverallLeaderboardView}:
 * it resolves the display plugin by the score's `type` tag and renders each of
 * its views through the shared table view. A two-view plugin (BAM/PAB: % and
 * Points) drives the toggle via {@link PluginViewSwitcher}, exactly like the
 * pairs matchpoint %/MP toggle.
 */
export function TeamOverallLeaderboardView<T extends TeamOverallScoreType>({
  score,
  teams,
  highlightAssignmentId,
  splitColumns,
  scroll,
  interactive,
}: Props<T>) {
  const plugin = getTeamOverallPlugin(score.type as T);

  return (
    <PluginViewSwitcher
      views={plugin.views}
      renderView={(view) => (
        <ScoreTableView
          table={view.toTable(score, teams)}
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
