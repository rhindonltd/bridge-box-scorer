import type { ScoredBoard } from "@/modules/scoring";
import type {
  OverallScoreAndParticipant,
  TeamOverallScoreType,
} from "@/model/leaderboard";
import type { PerBoardView, TableView } from "./view-types";
import { mpTravellerViews } from "./traveller/mp";
import { impTravellerViews } from "./traveller/imp";
import { ximpTravellerViews } from "./traveller/x-imp";
import { mpLeaderboardViews } from "./leaderboard/pairs-mp";
import { ximpLeaderboardViews } from "./leaderboard/pairs-x-imp";
import { buildSwissVpTable } from "./leaderboard/swiss-vp-view";
import {
  teamOverallViews,
  type TeamOverallView,
} from "./leaderboard/team-views";

/** The traveller views for each per-board scoring, the default first. */
const travellerViewsById: Record<
  ScoredBoard["pluginId"],
  PerBoardView<never>[]
> = {
  MP: mpTravellerViews,
  IMP: impTravellerViews,
  XIMP: ximpTravellerViews,
};

/**
 * The ways to show one scored board (a traveller), the default first. The
 * view is chosen by the scoring that produced the board, so callers never need
 * to know which scoring it was.
 */
export function travellerViews(scored: ScoredBoard): TableView<ScoredBoard>[] {
  const views = travellerViewsById[scored.pluginId] as PerBoardView<unknown>[];
  return views.map((view) => ({
    id: view.id,
    label: view.label,
    toTable: (board, options) => view.toTable(board.lines, options),
  }));
}

/** Bind a team view to the standings it is shown with. */
function teamView<T extends TeamOverallScoreType>(
  view: TeamOverallView<T>,
): TableView<OverallScoreAndParticipant> {
  return {
    id: view.id,
    label: view.label,
    toTable: (standings) =>
      view.toTable(
        standings.overallScore as Parameters<TeamOverallView<T>["toTable"]>[0],
        standings.participants as Parameters<TeamOverallView<T>["toTable"]>[1],
      ),
  };
}

/**
 * The ways to show one set of standings, any format, the default first.
 * Matchpoint pairs and the board-comparison teams formats have two views
 * (shown with a toggle); every other format has one.
 */
export function leaderboardViews(
  given: OverallScoreAndParticipant,
): TableView<OverallScoreAndParticipant>[] {
  const standings = withType(given);
  switch (standings.type) {
    case "TEAM_SWISS_VP":
    case "TEAM_IMP_AGG":
    case "TEAM_BAM":
    case "TEAM_PAB":
      return teamOverallViews(standings.type).map((view) => teamView(view));
    case "PAIR_SWISS_VP":
      // Swiss Pairs Victory Points: one per-round table.
      return [
        {
          id: "vp",
          label: "VP",
          toTable: (given) => {
            const s = withType(given);
            return s.type === "PAIR_SWISS_VP"
              ? buildSwissVpTable(s.overallScore, s.participants)
              : unreachable(s);
          },
        },
      ];
    case "PAIR_MP":
      return mpLeaderboardViews.map((view) => ({
        id: view.id,
        label: view.label,
        toTable: (given, options) => {
          const s = withType(given);
          return s.type === "PAIR_MP"
            ? view.toTable(s.overallScore, s.participants, options)
            : unreachable(s);
        },
      }));
    case "PAIR_XIMP":
      return ximpLeaderboardViews.map((view) => ({
        id: view.id,
        label: view.label,
        toTable: (given, options) => {
          const s = withType(given);
          return s.type === "PAIR_XIMP"
            ? view.toTable(s.overallScore, s.participants, options)
            : unreachable(s);
        },
      }));
  }
}

/**
 * The standings with their `type` taken from the score itself. A two-winner
 * event's per-direction rankings carry only `overallScore` and `participants`,
 * so the score's own `type` tag is the one that is always present.
 */
function withType(
  standings: OverallScoreAndParticipant,
): OverallScoreAndParticipant {
  return standings.type === standings.overallScore.type
    ? standings
    : ({
        ...standings,
        type: standings.overallScore.type,
      } as OverallScoreAndParticipant);
}

/**
 * A view is only ever handed the standings it was built for; anything else is
 * a programming error.
 */
function unreachable(standings: OverallScoreAndParticipant): never {
  throw new Error(
    `View built for a different standings type, got "${standings.type}"`,
  );
}
