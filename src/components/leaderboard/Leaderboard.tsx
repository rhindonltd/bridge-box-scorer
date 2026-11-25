import { OverallScoreAndParticipant } from "@/model/leaderboard";
import { OverallLeaderboardView } from "@/components/scoring/OverallLeaderboardView";
import { leaderboardViews } from "@/modules/results-views";

type Props = {
  overallScoreAndParticipant: OverallScoreAndParticipant;
  /**
   * When set, the row for this participant is highlighted. This is the
   * pair's / team's assignment id.
   */
  highlightAssignmentId?: string;
  /**
   * Spread the standings across this many side-by-side columns (default 1).
   * Used by the room display to fill a wide TV screen.
   */
  splitColumns?: number;
  /**
   * Whether the standings table owns its own scroll region (default true).
   * The room display passes false so its own auto-scroll container owns
   * scrolling and the table's sticky header stays pinned while rows scroll.
   */
  scroll?: boolean;
  /**
   * For matchpoint pairs (which has %/matchpoints views), render this view id
   * and hide the in-screen toggle. The room display sets it from the MP/%
   * choice made on the preceding screen. Ignored by the other formats.
   */
  selectedViewId?: string;
  /**
   * Whether cells may be interactive (default true). The passive room display
   * passes false so a team name shows as static text rather than a button that
   * expands to its players.
   */
  interactive?: boolean;
};

/**
 * Renders any set of standings — pairs (matchpoints, Cross-IMP, Swiss VP) or
 * teams (Swiss VP, aggregate IMPs, Board-a-Match, Point-a-Board) — through its
 * leaderboard views. A format with two views shows a toggle.
 */
export function Leaderboard({
  overallScoreAndParticipant,
  highlightAssignmentId,
  splitColumns,
  scroll,
  selectedViewId,
  interactive,
}: Props) {
  // (Read the score's own type: a two-winner direction carries no top-level
  // `type`.) The room display's MP/% choice applies to pairs standings only: the
  // board-comparison teams views also have a "percentage" view, and their
  // toggle must stay on screen.
  const isPairs =
    overallScoreAndParticipant.overallScore.type.startsWith("PAIR_");

  return (
    <OverallLeaderboardView
      views={leaderboardViews(overallScoreAndParticipant)}
      standings={overallScoreAndParticipant}
      highlightAssignmentId={highlightAssignmentId}
      splitColumns={splitColumns}
      scroll={scroll}
      selectedViewId={isPairs ? selectedViewId : undefined}
      interactive={interactive}
    />
  );
}
