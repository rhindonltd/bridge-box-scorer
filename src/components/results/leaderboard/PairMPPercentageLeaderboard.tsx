import { OverallPairMPScore } from "@/model/leaderboard";
import { Table } from "@/components/common/table/Table";
import { TableRow } from "@/components/common/table/TableRow";

interface Props {
  leaderboard: OverallPairMPScore;
}

export function PairMPPercentageLeaderboard({ leaderboard }: Props) {
  return (
    <Table
      columns={["Rank", "Pair Id", "MP"]}
      body={leaderboard.lines.map((row, index, arr) => {
        const isLast = index === arr.length - 1;
        return (
          <TableRow
            key={index}
            cells={[
              row.tied ? `${row.rank}=` : row.rank,
              row.pairId,
              ((row.totalMP / row.maxMP) * 100).toFixed(2),
            ]}
            className={isLast ? "rounded-bl-lg rounded-br-lg" : ""}
          />
        );
      })}
    />
  );
}
