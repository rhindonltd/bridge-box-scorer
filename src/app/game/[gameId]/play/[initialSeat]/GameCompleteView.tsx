"use client";

import { Leaderboard } from "@/components/leaderboard/Leaderboard";
import { Spinner } from "@/components/common/Spinner";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import type { OverallScoreAndParticipant } from "@/model/leaderboard";

export interface GameCompleteViewProps {
  /**
   * The final leaderboard, or null when it hasn't arrived / there is nothing to
   * show — in which case a plain "Game Complete" acknowledgement is rendered.
   */
  leaderboard: OverallScoreAndParticipant | null;
  /** While true, show a spinner instead of the layout. */
  isLoading: boolean;
  /** Assignment id whose leaderboard row should be highlighted. */
  highlightAssignmentId?: string;
  /** Right-hand header content (the play header menu). */
  headerRight?: React.ReactNode;
}

/**
 * Presentational end-of-game screen. It owns no data — the container
 * ({@link GameComplete}) sources the leaderboard from the leaderboard context
 * and the highlight id from the assignment context. Keeping this props-only
 * makes the loading, empty, and populated states directly storyable and
 * testable without socket/context wiring.
 */
export function GameCompleteView({
  leaderboard,
  isLoading,
  highlightAssignmentId,
  headerRight,
}: GameCompleteViewProps) {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <GamePageLayout headerTitle="Game Complete" headerRight={headerRight} hideBack>
      <div className="flex-1 min-h-0">
        {leaderboard ? (
          <Leaderboard
            overallScoreAndParticipant={leaderboard}
            highlightAssignmentId={highlightAssignmentId}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-6">
            <div className="text-2xl font-bold text-gray-900 mb-2">
              Game Complete
            </div>
            <div className="text-base text-gray-500 text-center">
              All rounds have been played. Thank you!
            </div>
          </div>
        )}
      </div>
    </GamePageLayout>
  );
}
