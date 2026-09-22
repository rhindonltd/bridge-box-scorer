import { buildSwissTeamsVpTable } from "@/scoring/swiss/swiss-teams-vp-view";
import { buildTeamsImpAggregateTable } from "@/scoring/swiss/teams-imp-aggregate-view";
import { buildTeamsBoardComparisonTable } from "@/scoring/swiss/teams-board-comparison-view";
import {
  TeamOverallPlugin,
  TeamOverallScoreType,
  TeamOverallView,
} from "./types";

/**
 * Swiss Teams Victory Points: a single per-round table (Rank / Team / Total /
 * one column per round).
 */
const swissVpPlugin: TeamOverallPlugin<"TEAM_SWISS_VP"> = {
  type: "TEAM_SWISS_VP",
  views: [
    {
      id: "vp",
      label: "VP",
      toTable: (score, teams) => buildSwissTeamsVpTable(score, teams),
    },
  ],
};

/**
 * Aggregate-IMP teams: a single per-round table showing each team's net IMPs
 * per round and its running total.
 */
const impAggPlugin: TeamOverallPlugin<"TEAM_IMP_AGG"> = {
  type: "TEAM_IMP_AGG",
  views: [
    {
      id: "imps",
      label: "IMP",
      toTable: (score, teams) => buildTeamsImpAggregateTable(score, teams),
    },
  ],
};

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

const bamPlugin: TeamOverallPlugin<"TEAM_BAM"> = {
  type: "TEAM_BAM",
  views: boardComparisonViews<"TEAM_BAM">(),
};

const pabPlugin: TeamOverallPlugin<"TEAM_PAB"> = {
  type: "TEAM_PAB",
  views: boardComparisonViews<"TEAM_PAB">(),
};

/**
 * Registry of team overall displays, keyed by the team score `type` tag. This
 * is the teams counterpart to the pairs overall plugin registry: the single
 * source of truth for how each team standing is presented, so the leaderboard
 * component resolves a display here rather than branching on the score type.
 */
const teamOverallPlugins = {
  TEAM_SWISS_VP: swissVpPlugin,
  TEAM_IMP_AGG: impAggPlugin,
  TEAM_BAM: bamPlugin,
  TEAM_PAB: pabPlugin,
} satisfies { [T in TeamOverallScoreType]: TeamOverallPlugin<T> };

/** Resolve the team overall display plugin for a team score `type` tag. */
export function getTeamOverallPlugin<T extends TeamOverallScoreType>(
  type: T,
): TeamOverallPlugin<T> {
  // The record is keyed by the exact tag, but indexing by the generic `T`
  // widens to the plugin union; cast back to the specific entry (safe: the
  // record's value at key `T` is `TeamOverallPlugin<T>` by construction).
  return teamOverallPlugins[type] as unknown as TeamOverallPlugin<T>;
}
