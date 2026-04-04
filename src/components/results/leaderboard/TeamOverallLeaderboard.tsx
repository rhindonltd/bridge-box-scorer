import { OverallTeamScore } from "@/model/leaderboard";
import { Table } from "@/components/common/table/Table";
import { TableRow } from "@/components/common/table/TableRow";
import { TeamAssignment } from "@/model/participants";

interface Props {
  teams: TeamAssignment[];
  leaderboard: OverallTeamScore;
}

export function TeamOverallLeaderboard({ teams, leaderboard }: Props) {
  const getPlayerNames = (playerId: string) => {
    const participant = teams.find((ind) => ind.teamId === playerId);
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
      columns={["Rank", "Team", "IMP/VP/PAB"]} // TODO: Fix this
      body={leaderboard.lines.map((row, index, arr) => {
        const isLast = index === arr.length - 1;
        return (
          <TableRow
            key={index}
            cells={[
              row.tied ? `${row.rank}=` : row.rank,
              getPlayerNames(row.teamId),
              row.score,
            ]}
            className={isLast ? "rounded-bl-lg rounded-br-lg" : ""}
          />
        );
      })}
    />
  );
}
