import { OverallTeamMatchScore } from "@/model/leaderboard";
import { Table } from "@/components/common/table/Table";
import { TableRow } from "@/components/common/table/TableRow";

interface Props {
  leaderboard: OverallTeamMatchScore;
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
