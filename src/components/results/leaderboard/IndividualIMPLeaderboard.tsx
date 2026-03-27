import { OverallIndividualIMPScore } from "@/model/leaderboard";
import { Table } from "@/components/common/table/Table";
import { TableRow } from "@/components/common/table/TableRow";
import { Individual } from "@/model/participants";

type Props = {
  individuals: Individual[];
  leaderboard: OverallIndividualIMPScore;
};

export function IndividualIMPLeaderboard({ individuals, leaderboard }: Props) {
  const getPlayerNames = (playerId: string) => {
    const participant = individuals.find((ind) => ind.playerId === playerId);
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
      columns={["Rank", "Player", "X-IMP"]}
      body={leaderboard.lines.map((row, index, arr) => {
        const isLast = index === arr.length - 1;
        return (
          <TableRow
            key={index}
            cells={[
              row.tied ? `${row.rank}=` : row.rank,
              getPlayerNames(row.playerId),
              row.crossImps,
            ]}
            className={isLast ? "rounded-bl-lg rounded-br-lg" : ""}
          />
        );
      })}
    />
  );
}
