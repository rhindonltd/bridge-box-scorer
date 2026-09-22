import { OverallScoreAndParticipant } from "@/model/leaderboard";
import { TeamOverallLeaderboardView } from "@/components/leaderboard/TeamOverallLeaderboardView";
import { OverallLeaderboardView } from "@/components/scoring/OverallLeaderboardView";
import { ScoreTableView } from "@/components/scoring/ScoreTableView";
import { buildSwissVpTable } from "@/scoring/swiss/swiss-vp-view";
import { getOverallPlugin } from "@/scoring/plugins/registry";
import "@/scoring/plugins/register";

type Props = {
  overallScoreAndParticipant: OverallScoreAndParticipant;
  /**
   * When set, the row for this participant is highlighted. This is the
   * pair's / team's assignment id.
   */
  highlightAssignmentId?: string;
  /**
   * Spread the standings across this many side-by-side columns (default 1).
   * Used by the room display to fill a wide TV screen; ignored by the team
   * match view (which is not a simple ranked list).
   */
  splitColumns?: number;
  /**
   * Whether the standings table owns its own scroll region (default true).
   * The room display passes false so its own auto-scroll container owns
   * scrolling and the table's sticky header stays pinned while rows scroll.
   */
  scroll?: boolean;
  /**
   * For pair plugins with more than one view (MP has %/matchpoints), render
   * this view id and hide the in-screen toggle. The room display sets it from
   * the MP/% choice made on the preceding screen. Ignored by single-view
   * plugins (IMP/XIMP) and the team/Swiss variants.
   */
  selectedViewId?: string;
  /**
   * Whether cells may be interactive (default true). The passive room display
   * passes false so a team name shows as static text rather than a button that
   * expands to its players.
   */
  interactive?: boolean;
};

export function Leaderboard({
  overallScoreAndParticipant,
  highlightAssignmentId,
  splitColumns,
  scroll,
  selectedViewId,
  interactive,
}: Props) {
  // TEAM standings are rendered via the team overall display registry (keyed
  // by the score's `type` tag); handle those first so the rest narrows to PAIR
  // (with AssignedPair[] participants).
  switch (overallScoreAndParticipant.type) {
    case "TEAM_SWISS_VP":
    case "TEAM_IMP_AGG":
    case "TEAM_BAM":
    case "TEAM_PAB":
      // Swiss VP / aggregate IMPs render a single per-round (or cumulative)
      // table; Board-a-Match / Point-a-Board add a %/Points toggle. Which of
      // those, and the table layout, is decided by the registry entry for the
      // score's type.
      return (
        <TeamOverallLeaderboardView
          score={overallScoreAndParticipant.overallScore}
          teams={overallScoreAndParticipant.participants}
          highlightAssignmentId={highlightAssignmentId}
          splitColumns={splitColumns}
          scroll={scroll}
          interactive={interactive}
        />
      );
    case "PAIR_SWISS_VP":
      // Swiss Pairs Victory Points is a per-round table rather than a single
      // aggregate column, so it renders through a dedicated table builder
      // instead of the plugin registry (which is keyed by MP/IMP/XIMP).
      return (
        <ScoreTableView
          table={buildSwissVpTable(
            overallScoreAndParticipant.overallScore,
            overallScoreAndParticipant.participants,
          )}
          highlightAssignmentId={highlightAssignmentId}
          rowTestId="leaderboard-row"
          splitColumns={splitColumns}
          scroll={scroll}
        />
      );
  }

  // PAIR scoring is fully plugin-driven: resolve the overall plugin by its
  // scoring id and render its views through the shared table view.
  const { overallScore, participants } = overallScoreAndParticipant;
  const plugin = getOverallPlugin(overallScore.scoring);

  return (
    <OverallLeaderboardView
      plugin={plugin}
      lines={overallScore}
      participants={participants}
      highlightAssignmentId={highlightAssignmentId}
      splitColumns={splitColumns}
      scroll={scroll}
      selectedViewId={selectedViewId}
    />
  );
}
