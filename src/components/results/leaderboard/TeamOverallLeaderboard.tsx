import { OverallTeamScore } from "@/model/leaderboard";
import { Table } from "@/components/common/table/Table";
import { TableRow } from "@/components/common/table/TableRow";

interface Props {
  leaderboard: OverallTeamScore;
}

export function TeamOverallLeaderboard({ leaderboard }: Props) {
  return (
    <Table
      columns={["Rank", "Pair Id", "IMP/VP/PAB"]} // TODO: Fix this
      body={leaderboard.lines.map((row, index, arr) => {
        const isLast = index === arr.length - 1;
        return (
          <TableRow
            key={index}
            cells={[
              row.tied ? `${row.rank}=` : row.rank,
              row.teamId,
              row.score,
            ]}
            className={isLast ? "rounded-bl-lg rounded-br-lg" : ""}
          />
        );
      })}
    />
  );
}
