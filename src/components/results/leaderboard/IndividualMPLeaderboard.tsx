import { OverallIndividualMPScore } from "@/model/leaderboard";
import { Table } from "@/components/common/table/Table";
import { TableRow } from "@/components/common/table/TableRow";
import { IndividualWithPlayer } from "@/model/participants";

type Props = {
  individuals: IndividualWithPlayer[];
  leaderboard: OverallIndividualMPScore;
};

export function IndividualMPLeaderboard({ individuals, leaderboard }: Props) {
  const getPlayerNames = (playerId: string) => {
    const participant = individuals.find(
      (individualWithPlayer) => individualWithPlayer.playerId === playerId,
    );
    if (!participant) return playerId;

    return (
      <div className="text-left">
        <div>
          {participant.player.firstName} {participant.player.lastName}
        </div>
      </div>
    );
  };

  return (
    <Table
      columns={["Rank", "Player", "MP"]}
      body={leaderboard.lines.map((row, index, arr) => {
        const isLast = index === arr.length - 1;
        return (
          <TableRow
            key={index}
            cells={[
              row.tied ? `${row.rank}=` : row.rank,
              getPlayerNames(row.playerId),
              `${row.totalMP}/${row.maxMP}`,
            ]}
            className={isLast ? "rounded-bl-lg rounded-br-lg" : ""}
          />
        );
      })}
    />
  );
}
