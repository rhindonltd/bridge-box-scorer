import { TeamMatchOverallScore } from "@/model/leaderboard";
import { Team } from "@/model/participants";

interface Props {
  teams: Team[];
  leaderboard: TeamMatchOverallScore;
}

export function TeamMatchLeaderboard({ leaderboard }: Props) {
  // rank
  // teamId
  // teamMatchLineScores: TeamMatchLineScore[];

  // export interface TeamMatchLineScore {
  //     board: number;
  //     opponent: string;
  //     teamScore: number;
  //     opponentScore: number;
  // }

  return <></>;
}
