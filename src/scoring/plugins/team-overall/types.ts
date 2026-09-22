import { ScoreTable } from "@/scoring/table/score-table";
import { AssignedTeam } from "@/model/participants";
import {
  TeamSwissVpOverallScore,
  TeamImpAggOverallScore,
  TeamBamOverallScore,
  TeamPabOverallScore,
} from "@/model/leaderboard";

/**
 * The team overall score `type` tags that have a registered display. These are
 * the only team standings any scorer produces today (Swiss VP, aggregate IMPs,
 * Board-a-Match, Point-a-Board); the leaderboard service routes to the matching
 * scorer and tags the result with one of these.
 */
export type TeamOverallScoreType =
  | "TEAM_SWISS_VP"
  | "TEAM_IMP_AGG"
  | "TEAM_BAM"
  | "TEAM_PAB";

/** The concrete team overall score for a given `type` tag. */
export type TeamOverallScoreOf<T extends TeamOverallScoreType> = Extract<
  | TeamSwissVpOverallScore
  | TeamImpAggOverallScore
  | TeamBamOverallScore
  | TeamPabOverallScore,
  { type: T }
>;

/**
 * A single way of presenting a team overall standing (e.g. Board-a-Match
 * exposes a "%" view and a "Points" view). `toTable` is framework-free: it
 * returns a semantic {@link ScoreTable}, never React — mirroring the pairs
 * {@link import("@/scoring/plugins/types").OverallView}, but ranking teams
 * (`AssignedTeam[]`) rather than pairs.
 */
export interface TeamOverallView<T extends TeamOverallScoreType> {
  id: string;
  label: string;
  toTable: (score: TeamOverallScoreOf<T>, teams: AssignedTeam[]) => ScoreTable;
}

/**
 * A team overall display plugin: how to render the standings for one team
 * scoring. `views[0]` is the default; a plugin with two views (Board-a-Match /
 * Point-a-Board: % and Points) drives a toggle exactly like the pairs MP
 * plugin's %/MP toggle.
 */
export interface TeamOverallPlugin<T extends TeamOverallScoreType> {
  type: T;
  views: TeamOverallView<T>[];
}
