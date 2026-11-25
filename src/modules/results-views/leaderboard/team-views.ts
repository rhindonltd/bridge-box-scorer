import { buildSwissTeamsVpTable } from "@/modules/results-views/leaderboard/swiss-teams-vp-view";
import { buildTeamsImpAggregateTable } from "@/modules/results-views/leaderboard/teams-imp-aggregate-view";
import { buildTeamsBoardComparisonTable } from "@/modules/results-views/leaderboard/teams-board-comparison-view";
import type { ScoreTable } from "@/modules/results-views/table/score-table";
import type { AssignedTeam } from "@/model/participants";
import type {
  TeamOverallScoreOf,
  TeamOverallScoreType,
} from "@/model/leaderboard";

/**
 * A single way of presenting a team overall standing (e.g. Board-a-Match
 * exposes a "%" view and a "Points" view). `toTable` is framework-free: it
 * returns a semantic {@link ScoreTable}, never React — mirroring the pairs
 * overall views, but ranking teams (`AssignedTeam[]`) rather than pairs.
 */
export interface TeamOverallView<T extends TeamOverallScoreType> {
  id: string;
  label: string;
  toTable: (score: TeamOverallScoreOf<T>, teams: AssignedTeam[]) => ScoreTable;
}

/**
 * Swiss Teams Victory Points: a single per-round table (Rank / Team / Total /
 * one column per round).
 */
const swissVpViews: TeamOverallView<"TEAM_SWISS_VP">[] = [
  {
    id: "vp",
    label: "VP",
    toTable: (score, teams) => buildSwissTeamsVpTable(score, teams),
  },
];

/**
 * Aggregate-IMP teams: a single per-round table showing each team's net IMPs
 * per round and its running total.
 */
const impAggViews: TeamOverallView<"TEAM_IMP_AGG">[] = [
  {
    id: "imps",
    label: "IMP",
    toTable: (score, teams) => buildTeamsImpAggregateTable(score, teams),
  },
];

/**
 * The two board-comparison views (percentage / points) shared by Board-a-Match
 * and Point-a-Board. Percentage is first so it is the default and the "on" side
 * of the toggle, matching the previous board-comparison leaderboard.
 */
function boardComparisonViews<
  T extends "TEAM_BAM" | "TEAM_PAB",
>(): TeamOverallView<T>[] {
  return [
    {
      id: "percentage",
      label: "%",
      toTable: (score, teams) =>
        buildTeamsBoardComparisonTable(score, teams, "percentage"),
    },
    {
      id: "points",
      label: "Points",
      toTable: (score, teams) =>
        buildTeamsBoardComparisonTable(score, teams, "fraction"),
    },
  ];
}

/**
 * The team overall views, keyed by the team score `type` tag: the single source
 * of truth for how each team standing is presented. `views[0]` is the default;
 * two views (Board-a-Match / Point-a-Board: % and Points) drive a toggle.
 */
const teamOverallViewsByType = {
  TEAM_SWISS_VP: swissVpViews,
  TEAM_IMP_AGG: impAggViews,
  TEAM_BAM: boardComparisonViews<"TEAM_BAM">(),
  TEAM_PAB: boardComparisonViews<"TEAM_PAB">(),
} satisfies { [T in TeamOverallScoreType]: TeamOverallView<T>[] };

/** The views for a team overall score `type` tag. */
export function teamOverallViews<T extends TeamOverallScoreType>(
  type: T,
): TeamOverallView<T>[] {
  // The record is keyed by the exact tag, but indexing by the generic `T`
  // widens to the view-list union; cast back to the specific entry (safe: the
  // record's value at key `T` is `TeamOverallView<T>[]` by construction).
  return teamOverallViewsByType[type] as unknown as TeamOverallView<T>[];
}
