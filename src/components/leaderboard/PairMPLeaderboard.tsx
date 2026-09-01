import { Table } from "@/components/common/table/Table";
import { TableRow } from "@/components/common/table/TableRow";
import { AssignedPair } from "@/model/participants";
import { PairMatchpointOverallScore } from "@//model/leaderboard";

interface Props {
  pairs: AssignedPair[];
  leaderboard: PairMatchpointOverallScore;
  highlightAssignmentId?: string;
}

export function PairMPLeaderboard({
  pairs,
  leaderboard,
  highlightAssignmentId,
}: Props) {
  const getPlayerNames = (playerId: string) => {
    const participant = pairs.find((ind) => ind.id === playerId);
    if (!participant) return playerId;

    return (
      <div className="text-left">
        <div>
          {participant.player1.firstName} {participant.player1.lastName}
        </div>
        <div>
          {participant.player2.firstName} {participant.player2.lastName}
        </div>
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
            highlighted={row.pairId === highlightAssignmentId}
            striped={highlightAssignmentId === undefined}
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
