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
    />
  );
}
