import { OverallScoreAndParticipant } from "@/model/leaderboard";
import { TeamMatchLeaderboard } from "@/components/leaderboard/TeamMatchLeaderboard";
import { TeamOverallLeaderboard } from "@/components/leaderboard/TeamOverallLeaderboard";
import { OverallLeaderboardView } from "@/components/scoring/OverallLeaderboardView";
import { getOverallPlugin } from "@/scoring/plugins/registry";
import "@/scoring/plugins/register";

type Props = {
  overallScoreAndParticipant: OverallScoreAndParticipant;
  /**
   * When set, the row for this participant is highlighted. This is the
   * pair's / team's assignment id.
   */
  highlightAssignmentId?: string;
};

export function Leaderboard({
  overallScoreAndParticipant,
  highlightAssignmentId,
}: Props) {
  const { overallScore, participants } = overallScoreAndParticipant;

  // PAIR scoring is fully plugin-driven: resolve the overall plugin by its
  // scoring id and render its views through the shared table view.
  if (overallScore.mode === "PAIR") {
    const plugin = getOverallPlugin(overallScore.scoring);

    return (
      <OverallLeaderboardView
        plugin={plugin}
        lines={overallScore}
        participants={participants}
        highlightAssignmentId={highlightAssignmentId}
      />
    );
  }

  // TEAM scoring is not yet plugin-migrated; keep the existing components.
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
    default:
      return null;
  }
}
