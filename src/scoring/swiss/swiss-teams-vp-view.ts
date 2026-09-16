import {
  ScoreTable,
  multilineCell,
  numberCell,
  textCell,
} from "@/scoring/table/score-table";
import { TeamSwissVpOverallScore } from "@/model/leaderboard";
import { AssignedTeam } from "@/model/participants";
import { rankCell } from "@/scoring/plugins/overall/overall-view";

/**
 * The four player names of a team ("First Last"), for the Team column. Falls
 * back to the raw team id when the team is not found.
 */
function teamNameLines(teams: AssignedTeam[], teamId: string): string[] {
  const team = teams.find((t) => t.id === teamId);
  if (!team) return [teamId];
  return [team.pair1, team.pair2].flatMap((pair) => [
    `${pair.player1.firstName} ${pair.player1.lastName}`.trim(),
    `${pair.player2.firstName} ${pair.player2.lastName}`.trim(),
  ]);
}

/**
 * Build the Swiss Teams Victory-Point leaderboard table: Rank, Team, Total,
 * then one column per round (1..N). A team's cell for a round shows its VP for
 * that round; the round in progress shows the running estimate (10 until a
 * result lands). The number of round columns is the highest round any team has
 * been scored in.
 *
 * Rows carry the team id in `highlightIds`, so the shared table view highlights
 * the viewing team's row the same way every other leaderboard does.
 */
export function buildSwissTeamsVpTable(
  leaderboard: TeamSwissVpOverallScore,
  teams: AssignedTeam[],
): ScoreTable {
  const roundCount = leaderboard.lines.reduce((max, line) => {
    const rounds = Object.keys(line.vpByRound).map(Number);
    return rounds.length === 0 ? max : Math.max(max, ...rounds);
  }, 0);

  const roundNumbers = Array.from({ length: roundCount }, (_, i) => i + 1);

  return {
    columns: [
      { label: "Rank" },
      { label: "Team" },
      { label: "Total" },
      ...roundNumbers.map((r) => ({ label: `${r}` })),
    ],
    rows: leaderboard.lines.map((row) => ({
      highlightIds: [row.teamId],
      cells: [
        rankCell(row),
        multilineCell(teamNameLines(teams, row.teamId)),
        numberCell(row.totalVP, 2),
        ...roundNumbers.map((r) => {
          const vp = row.vpByRound[r];
          return vp === undefined ? textCell("") : numberCell(vp, 2);
        }),
      ],
    })),
  };
}
