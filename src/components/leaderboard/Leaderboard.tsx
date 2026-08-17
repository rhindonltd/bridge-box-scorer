import { OverallScoreAndParticipant } from "@/model/leaderboard";
import { PairIMPLeaderboard } from "@/components/leaderboard/PairIMPLeaderboard";
import { TeamMatchLeaderboard } from "@/components/leaderboard/TeamMatchLeaderboard";
import { TeamOverallLeaderboard } from "@/components/leaderboard/TeamOverallLeaderboard";
import { PairMP } from "@/components/leaderboard/PairMP";

type Props = {
  overallScoreAndParticipant: OverallScoreAndParticipant;
};

export function Leaderboard({ overallScoreAndParticipant }: Props) {
  switch (overallScoreAndParticipant.type) {
    case "PAIR_MP":
      return (
        <PairMP
          pairs={overallScoreAndParticipant.participants}
          leaderboard={overallScoreAndParticipant.overallScore}
        />
      );
    case "PAIR_XIMP":
      return (
        <PairIMPLeaderboard
          pairs={overallScoreAndParticipant.participants}
          leaderboard={overallScoreAndParticipant.overallScore}
        />
      );
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
        />
      );
    default:
      return null;
  }
}
