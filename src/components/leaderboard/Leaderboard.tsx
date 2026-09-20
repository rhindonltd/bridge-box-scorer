import { OverallScoreAndParticipant } from "@/model/leaderboard";
import { TeamMatchLeaderboard } from "@/components/leaderboard/TeamMatchLeaderboard";
import { TeamOverallLeaderboard } from "@/components/leaderboard/TeamOverallLeaderboard";
import { TeamBoardComparisonLeaderboard } from "@/components/leaderboard/TeamBoardComparisonLeaderboard";
import { OverallLeaderboardView } from "@/components/scoring/OverallLeaderboardView";
import { ScoreTableView } from "@/components/scoring/ScoreTableView";
import { buildSwissVpTable } from "@/scoring/swiss/swiss-vp-view";
import { buildSwissTeamsVpTable } from "@/scoring/swiss/swiss-teams-vp-view";
import { getOverallPlugin } from "@/scoring/plugins/registry";
import "@/scoring/plugins/register";

type Props = {
  overallScoreAndParticipant: OverallScoreAndParticipant;
  /**
   * When set, the row for this participant is highlighted. This is the
   * pair's / team's assignment id.
   */
  highlightAssignmentId?: string;
  /**
   * Spread the standings across this many side-by-side columns (default 1).
   * Used by the room display to fill a wide TV screen; ignored by the team
   * match view (which is not a simple ranked list).
   */
  splitColumns?: number;
};

export function Leaderboard({
  overallScoreAndParticipant,
  highlightAssignmentId,
  splitColumns,
}: Props) {
  // TEAM scoring is not yet plugin-migrated; handle those variants first so
  // the remaining case narrows to PAIR (with AssignedPair[] participants).
  switch (overallScoreAndParticipant.type) {
    case "TEAM_MATCH":
      return (
        <TeamMatchLeaderboard
          teams={overallScoreAndParticipant.participants}
          leaderboard={overallScoreAndParticipant.overallScore}
        />
      );
    case "TEAM_OVERALL":
      return (
        <TeamOverallLeaderboard
          teams={overallScoreAndParticipant.participants}
          leaderboard={overallScoreAndParticipant.overallScore}
          highlightAssignmentId={highlightAssignmentId}
        />
      );
    case "TEAM_SWISS_VP":
      // Swiss Teams Victory Points: a per-round table keyed by team, rendered
      // through the shared table view (highlighting the viewing team's row).
      return (
        <ScoreTableView
          table={buildSwissTeamsVpTable(
            overallScoreAndParticipant.overallScore,
            overallScoreAndParticipant.participants,
          )}
          highlightAssignmentId={highlightAssignmentId}
          rowTestId="leaderboard-row"
          splitColumns={splitColumns}
        />
      );
    case "TEAM_BAM":
    case "TEAM_PAB":
      // Board-comparison teams (Board-a-Match or Point-a-Board): points-won
      // standings with a fraction/% toggle. The scale (BAM 1 / PAB 2 points per
      // board) and the table layout (per-round for a barometer Swiss Teams
      // movement, cumulative for Round Robin) are chosen from the score.
      return (
        <TeamBoardComparisonLeaderboard
          leaderboard={overallScoreAndParticipant.overallScore}
          teams={overallScoreAndParticipant.participants}
          highlightAssignmentId={highlightAssignmentId}
          splitColumns={splitColumns}
        />
      );
    case "PAIR_SWISS_VP":
      // Swiss Pairs Victory Points is a per-round table rather than a single
      // aggregate column, so it renders through a dedicated table builder
      // instead of the plugin registry (which is keyed by MP/IMP/XIMP).
      return (
        <ScoreTableView
          table={buildSwissVpTable(
            overallScoreAndParticipant.overallScore,
            overallScoreAndParticipant.participants,
          )}
          highlightAssignmentId={highlightAssignmentId}
          rowTestId="leaderboard-row"
          splitColumns={splitColumns}
        />
      );
  }

  // PAIR scoring is fully plugin-driven: resolve the overall plugin by its
  // scoring id and render its views through the shared table view.
  const { overallScore, participants } = overallScoreAndParticipant;
  const plugin = getOverallPlugin(overallScore.scoring);

  return (
    <OverallLeaderboardView
      plugin={plugin}
      lines={overallScore}
      participants={participants}
      highlightAssignmentId={highlightAssignmentId}
      splitColumns={splitColumns}
    />
  );
}
