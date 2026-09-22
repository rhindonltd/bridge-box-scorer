import { useState } from "react";
import { TeamOverallOverallScore } from "@/model/leaderboard";
import { Table } from "@/components/common/table/Table";
import { TableRow } from "@/components/common/table/TableRow";
import { AssignedTeam } from "@/model/participants";

interface Props {
  teams: AssignedTeam[];
  leaderboard: TeamOverallOverallScore;
  highlightAssignmentId?: string;
  /**
   * Whether the table owns its own scroll region (default true). The room
   * display passes false so its auto-scroll container owns scrolling.
   */
  scroll?: boolean;
  /**
   * Whether the team name is tappable to reveal its players (default true).
   * The passive room display passes false, showing a static team name.
   */
  interactive?: boolean;
}

/** The four player names of a team ("First Last"), in NS-then-EW order. */
function teamPlayerLines(team: AssignedTeam): string[] {
  return [team.pair1, team.pair2].flatMap((pair) => [
    `${pair.player1.firstName} ${pair.player1.lastName}`.trim(),
    `${pair.player2.firstName} ${pair.player2.lastName}`.trim(),
  ]);
}

/**
 * The Team cell: the team's name, which expands to the four player names when
 * tapped. Rendered as an accessible, keyboard-focusable button with
 * `aria-expanded`. Falls back to the raw team id when the team is not found.
 */
function TeamNameCell({
  teams,
  teamId,
  interactive,
}: {
  teams: AssignedTeam[];
  teamId: string;
  interactive: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const team = teams.find((t) => t.id === teamId);

  if (!team) return <>{teamId}</>;

  // On a passive screen (the room display) the name is not tappable: show it as
  // static, left-aligned text with no expand button.
  if (!interactive) {
    return <div className="text-left font-medium">{team.name}</div>;
  }

  return (
    <div className="text-left">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="text-left font-medium underline decoration-dotted underline-offset-2"
      >
        {team.name}
      </button>
      {expanded && (
        <div className="mt-1 text-sm text-gray-600">
          {teamPlayerLines(team).map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TeamOverallLeaderboard({
  teams,
  leaderboard,
  highlightAssignmentId,
  scroll = true,
  interactive = true,
}: Props) {
  return (
    <Table
      columns={["Rank", "Team", "IMP/VP/PAB"]} // TODO: Fix this
      // Left-align the "Team" header (index 1) so it sits over the team names.
      aligns={["center", "left", "center"]}
      scroll={scroll}
      body={leaderboard.lines.map((row, index, arr) => {
        const isLast = index === arr.length - 1;
        return (
          <TableRow
            key={index}
            highlighted={row.teamId === highlightAssignmentId}
            striped={highlightAssignmentId === undefined}
            cells={[
              row.tied ? `${row.rank}=` : row.rank,
              <TeamNameCell
                key="team"
                teams={teams}
                teamId={row.teamId}
                interactive={interactive}
              />,
              row.score,
            ]}
            className={isLast ? "rounded-bl-lg rounded-br-lg" : ""}
          />
        );
      })}
    />
  );
}
