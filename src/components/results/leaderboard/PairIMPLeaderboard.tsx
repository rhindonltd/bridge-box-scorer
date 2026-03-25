import { OverallPairIMPScore } from "@/model/leaderboard";
import { Table } from "@/components/common/table/Table";
import { TableRow } from "@/components/common/table/TableRow";

interface Props {
  leaderboard: OverallPairIMPScore;
}

export function PairIMPLeaderboard({ leaderboard }: Props) {
  return (
    <Table
      columns={["Rank", "Pair Id", "X-IMP"]}
      body={leaderboard.lines.map((row, index, arr) => {
        const isLast = index === arr.length - 1;
        return (
          <TableRow
            key={index}
            cells={[
              row.tied ? `${row.rank}=` : row.rank,
              row.pairId,
              row.crossImps,
            ]}
            className={isLast ? "rounded-bl-lg rounded-br-lg" : ""}
          />
        );
      })}
    />
  );
}
