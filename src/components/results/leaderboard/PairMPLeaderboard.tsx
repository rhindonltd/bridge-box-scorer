import { OverallPairMPScore } from "@/model/leaderboard";
import { Table } from "@/components/common/table/Table";
import { TableRow } from "@/components/common/table/TableRow";
import { Pair } from "@/model/participants";

interface Props {
  pairs: Pair[];
  leaderboard: OverallPairMPScore;
}

export function PairMPLeaderboard({ pairs, leaderboard }: Props) {
  const getPlayerNames = (playerId: string) => {
    const participant = pairs.find((ind) => ind.pairId === playerId);
    if (!participant) return playerId;

    return (
      <div className="text-left">
        {participant.players.map((p, i) => (
          <div key={i}>
            {p.firstName} {p.lastName}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Table
      columns={["Rank", "Pair", "MP"]}
      body={leaderboard.lines.map((row, index, arr) => {
        const isLast = index === arr.length - 1;
        return (
          <TableRow
            key={index}
            cells={[
              row.tied ? `${row.rank}=` : row.rank,
              getPlayerNames(row.pairId),
              `${row.totalMP}/${row.maxMP}`,
            ]}
            className={isLast ? "rounded-bl-lg rounded-br-lg" : ""}
          />
        );
      })}
    />
  );
}
