import {
  OverallIndividualIMPScore,
  OverallIndividualMPScore,
  OverallPairIMPScore,
  OverallPairMPScore,
  OverallScore,
  OverallTeamMatchScore,
  OverallTeamScore,
} from "@/model/leaderboard";
import { PairIMPLeaderboard } from "@/components/results/leaderboard/PairIMPLeaderboard";
import { IndividualIMPLeaderboard } from "@/components/results/leaderboard/IndividualIMPLeaderboard";
import { TeamMatchLeaderboard } from "@/components/results/leaderboard/TeamMatchLeaderboard";
import { TeamOverallLeaderboard } from "@/components/results/leaderboard/TeamOverallLeaderboard";
import { PairMP } from "@/components/results/leaderboard/PairMP";
import { IndividualMP } from "@/components/results/leaderboard/IndividualMP";

type Props = {
  overallScore: OverallScore;
};

export function Leaderboard({ overallScore }: Props) {
  switch (overallScore.type) {
    case "INDIVIDUAL_MP":
      return (
        <IndividualMP leaderboard={overallScore as OverallIndividualMPScore} />
      );
    case "INDIVIDUAL_IMP":
      return (
        <IndividualIMPLeaderboard
          leaderboard={overallScore as OverallIndividualIMPScore}
        />
      );
    case "PAIR_MP":
      return <PairMP leaderboard={overallScore as OverallPairMPScore} />;
    case "PAIR_IMP":
      return (
        <PairIMPLeaderboard leaderboard={overallScore as OverallPairIMPScore} />
      );
    case "TEAM_MATCH":
      return (
        <TeamMatchLeaderboard
          leaderboard={overallScore as OverallTeamMatchScore}
        />
      );
    case "TEAM_OVERALL":
      return (
        <TeamOverallLeaderboard
          leaderboard={overallScore as OverallTeamScore}
        />
      );
    default:
      return null;
  }
}
