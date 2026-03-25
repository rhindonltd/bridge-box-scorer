import { OverallIndividualMPScore } from "@/model/leaderboard";
import { Table } from "@/components/common/table/Table";
import { TableRow } from "@/components/common/table/TableRow";

type Props = {
  leaderboard: OverallIndividualMPScore;
};

export function IndividualMPPercentageLeaderboard({ leaderboard }: Props) {
  return (
    <Table
      columns={["Rank", "Player Id", "MP"]}
      body={leaderboard.lines.map((row, index, arr) => {
        const isLast = index === arr.length - 1;
        return (
          <TableRow
            key={index}
            cells={[
              row.tied ? `${row.rank}=` : row.rank,
              row.playerId,
              ((row.totalMP / row.maxMP) * 100).toFixed(2),
            ]}
            className={isLast ? "rounded-bl-lg rounded-br-lg" : ""}
          />
        );
      })}
    />
  );
}
