import {
  ScoreCell,
  ScoreTable,
  expandableCell,
  numberCell,
  textCell,
} from "@/scoring/table/score-table";
import {
  TeamBamOverallScore,
  TeamPabOverallScore,
} from "@/model/leaderboard";
import { AssignedTeam } from "@/model/participants";
import { rankCell } from "@/scoring/plugins/overall/overall-view";

/** Which presentation a board-comparison table renders. */
export type BoardComparisonView = "fraction" | "percentage";

type BoardComparisonScore = TeamBamOverallScore | TeamPabOverallScore;

/** Points a single board is worth on this scoring's scale (BAM 1, PAB 2). */
function winPointsFor(scoring: BoardComparisonScore["scoring"]): number {
  return scoring === "PAB" ? 2 : 1;
}

/** Format a points value: whole numbers plainly ("6"), halves as "5.5". */
function formatPoints(points: number): string {
  return Number.isInteger(points) ? `${points}` : points.toFixed(1);
}

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
 * A board-comparison cell. `won`/`played` are in native board units; the scale
 * (`winPoints`) converts them to the scoring's own points:
 *   - fraction: "pointsWon/pointsAvailable" (BAM "1.5/3", PAB "3/6")
 *   - percentage: pointsWon / pointsAvailable * 100 (scale-independent)
 */
function comparisonCell(
  won: number,
  played: number,
  winPoints: number,
  view: BoardComparisonView,
): ScoreCell {
  const pointsWon = won * winPoints;
  const pointsAvailable = played * winPoints;
  if (view === "percentage") {
    return numberCell(
      pointsAvailable === 0 ? 0 : (pointsWon / pointsAvailable) * 100,
      2,
    );
  }
  return textCell(`${formatPoints(pointsWon)}/${formatPoints(pointsAvailable)}`);
}

/**
 * Build a board-comparison teams leaderboard table (Board-a-Match or
 * Point-a-Board) for the given view.
 *
 * The scale is read from the score's `scoring` (BAM = 1 point per board, PAB =
 * 2) and applied to the native board-unit figures, so BAM shows "1.5/3" and PAB
 * "3/6" for the same 1.5 boards of 3 (both 50%).
 *
 * Layout depends on the movement's barometer flag:
 * - Barometer (Swiss Teams): Rank / Team / Total / one column per round.
 * - Non-barometer (Round Robin): Rank / Team / Total only — teams meet on
 *   different boards each round, so a per-round-number breakdown is not
 *   meaningful; the cumulative total is the score.
 */
export function buildTeamsBoardComparisonTable(
  leaderboard: BoardComparisonScore,
  teams: AssignedTeam[],
  view: BoardComparisonView,
): ScoreTable {
  const winPoints = winPointsFor(leaderboard.scoring);
  const cell = (won: number, played: number): ScoreCell =>
    comparisonCell(won, played, winPoints, view);

  if (!leaderboard.barometer) {
    return {
      columns: [{ label: "Rank" }, { label: "Team" }, { label: "Total" }],
      rows: leaderboard.lines.map((row) => ({
        highlightIds: [row.teamId],
        cells: [
          rankCell(row),
          teamNameCell(teams, row.teamId),
          cell(row.totalWon, row.totalPlayed),
        ],
      })),
    };
  }

  const roundCount = leaderboard.lines.reduce((max, line) => {
    const rounds = Object.keys(line.byRound).map(Number);
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
        cell(row.totalWon, row.totalPlayed),
        ...roundNumbers.map((r) => {
          const rc = row.byRound[r];
          return rc === undefined ? textCell("") : cell(rc.won, rc.played);
        }),
      ],
    })),
  };
}
