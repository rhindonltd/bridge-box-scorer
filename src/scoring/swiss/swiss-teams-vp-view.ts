import {
  ScoreCell,
  ScoreTable,
  expandableCell,
  numberCell,
  textCell,
} from "@/scoring/table/score-table";
import { TeamSwissVpOverallScore } from "@/model/leaderboard";
import { AssignedTeam } from "@/model/participants";
import { rankCell } from "@/scoring/plugins/overall/overall-view";

/** The four player names of a team ("First Last"), in NS-then-EW order. */
function teamPlayerLines(team: AssignedTeam): string[] {
  return [team.pair1, team.pair2].flatMap((pair) => [
    `${pair.player1.firstName} ${pair.player1.lastName}`.trim(),
    `${pair.player2.firstName} ${pair.player2.lastName}`.trim(),
  ]);
}

/**
 * The Team column cell: the team's name, which expands to the four player
 * names when tapped. Falls back to the raw team id (as plain text) when the
 * team is not found.
 */
function teamNameCell(teams: AssignedTeam[], teamId: string): ScoreCell {
  const team = teams.find((t) => t.id === teamId);
  if (!team) return textCell(teamId);
  return expandableCell(team.name, teamPlayerLines(team));
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
        teamNameCell(teams, row.teamId),
        numberCell(row.totalVP, 2),
        ...roundNumbers.map((r) => {
          const vp = row.vpByRound[r];
          return vp === undefined ? textCell("") : numberCell(vp, 2);
        }),
      ],
    })),
  };
}
