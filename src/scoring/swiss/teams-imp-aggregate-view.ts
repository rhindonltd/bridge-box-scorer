import {
  ScoreTable,
  numberCell,
  textCell,
} from "@/scoring/table/score-table";
import { TeamImpAggOverallScore } from "@/model/leaderboard";
import { AssignedTeam } from "@/model/participants";
import {
  rankCell,
  roundColumnNumbers,
} from "@/scoring/plugins/overall/overall-view";
import { teamNameCell } from "@/scoring/plugins/overall/team-names";

/**
 * Build the aggregate-IMP teams leaderboard table: Rank, Team, Total, then one
 * column per round (1..N). A team's cell for a round shows its net IMPs for
 * that round (which can be negative); the round in progress shows the running
 * estimate as boards come in. The number of round columns is the highest round
 * any team has been scored in.
 *
 * IMP figures are whole numbers, so Total and the per-round cells render with
 * no decimal places. Rows carry the team id in `highlightIds` so the shared
 * table view highlights the viewing team's row like every other leaderboard.
 */
export function buildTeamsImpAggregateTable(
  leaderboard: TeamImpAggOverallScore,
  teams: AssignedTeam[],
): ScoreTable {
  const roundNumbers = roundColumnNumbers(
    leaderboard.lines,
    (line) => line.impsByRound,
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
        numberCell(row.totalImps, 0),
        ...roundNumbers.map((r) => {
          const imps = row.impsByRound[r];
          return imps === undefined ? textCell("") : numberCell(imps, 0);
        }),
      ],
    })),
  };
}
