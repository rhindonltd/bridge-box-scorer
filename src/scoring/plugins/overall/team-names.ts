import { AssignedTeam } from "@/model/participants";
import { ScoreCell, expandableCell, textCell } from "@/scoring/table/score-table";

/** The four player names of a team ("First Last"), in NS-then-EW order. */
export function teamPlayerLines(team: AssignedTeam): string[] {
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
export function teamNameCell(teams: AssignedTeam[], teamId: string): ScoreCell {
  const team = teams.find((t) => t.id === teamId);
  if (!team) return textCell(teamId);
  return expandableCell(team.name, teamPlayerLines(team));
}
