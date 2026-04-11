import { OverallScoreAndParticipant } from "@/model/leaderboard";
import { PairIMPLeaderboard } from "@/components/results/leaderboard/PairIMPLeaderboard";
import { IndividualIMPLeaderboard } from "@/components/results/leaderboard/IndividualIMPLeaderboard";
import { TeamMatchLeaderboard } from "@/components/results/leaderboard/TeamMatchLeaderboard";
import { TeamOverallLeaderboard } from "@/components/results/leaderboard/TeamOverallLeaderboard";
import { PairMP } from "@/components/results/leaderboard/PairMP";
import { IndividualMP } from "@/components/results/leaderboard/IndividualMP";

type Props = {
  overallScoreAndParticipant: OverallScoreAndParticipant;
};

export function Leaderboard({ overallScoreAndParticipant }: Props) {
  switch (overallScoreAndParticipant.type) {
    case "INDIVIDUAL_MP":
      return (
        <IndividualMP
          individuals={overallScoreAndParticipant.participants}
          leaderboard={overallScoreAndParticipant.overallScore}
        />
      );
    case "INDIVIDUAL_XIMP":
      return (
        <IndividualIMPLeaderboard
          individuals={overallScoreAndParticipant.participants}
          leaderboard={overallScoreAndParticipant.overallScore}
        />
      );
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
