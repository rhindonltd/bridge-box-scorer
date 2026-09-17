"use client";

import { useAssignment } from "@/context/AssignmentContext";
import {
  LeaderboardProvider,
  useLeaderboardContext,
} from "@/context/LeaderboardContext";
import { GameCompleteView } from "@/app/game/[gameId]/play/[initialSeat]/GameCompleteView";

function GameCompleteContent({
  headerRight,
}: {
  headerRight?: React.ReactNode;
}) {
  const { assignment } = useAssignment();
  const { leaderboard, isLoading } = useLeaderboardContext();

  return (
    <GameCompleteView
      leaderboard={leaderboard}
      isLoading={isLoading}
      highlightAssignmentId={assignment?.id}
      headerRight={headerRight}
    />
  );
}

export function GameComplete({
  headerRight,
}: {
  /** Right-hand header content (the play header menu). */
  headerRight?: React.ReactNode;
}) {
  return (
    <LeaderboardProvider>
      <GameCompleteContent headerRight={headerRight} />
    </LeaderboardProvider>
  );
}
