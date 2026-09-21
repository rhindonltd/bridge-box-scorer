import {
  ScoreTable,
  numberCell,
  textCell,
} from "@/scoring/table/score-table";
import { TeamSwissVpOverallScore } from "@/model/leaderboard";
import { AssignedTeam } from "@/model/participants";
import {
  rankCell,
  roundColumnNumbers,
} from "@/scoring/plugins/overall/overall-view";
import { teamNameCell } from "@/scoring/plugins/overall/team-names";

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
  const roundNumbers = roundColumnNumbers(
    leaderboard.lines,
    (line) => line.vpByRound,
  );

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
