import { OverallIndividualIMPScore } from "@/model/leaderboard";
import { Table } from "@/components/common/table/Table";
import { TableRow } from "@/components/common/table/TableRow";

type Props = {
  leaderboard: OverallIndividualIMPScore;
};

export function IndividualIMPLeaderboard({ leaderboard }: Props) {
  return (
    <Table
      columns={["Rank", "Player Id", "X-IMP"]}
      body={leaderboard.lines.map((row, index, arr) => {
        const isLast = index === arr.length - 1;
        return (
          <TableRow
            key={index}
            cells={[
              row.tied ? `${row.rank}=` : row.rank,
              row.playerId,
              row.crossImps,
            ]}
            className={isLast ? "rounded-bl-lg rounded-br-lg" : ""}
          />
        );
      })}
    />
  );
}
