"use client";

import { Leaderboard } from "@/components/leaderboard/Leaderboard";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { useAssignment } from "@/context/AssignmentContext";
import {
  LeaderboardProvider,
  useLeaderboardContext,
} from "@/context/LeaderboardContext";

function GameCompleteContent() {
  const { assignment } = useAssignment();
  const { leaderboard, isLoading } = useLeaderboardContext();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <GamePageLayout headerTitle="Game Complete">
      <div className="flex-1 min-h-0">
        {leaderboard ? (
          <Leaderboard
            overallScoreAndParticipant={leaderboard}
            highlightAssignmentId={assignment?.id}
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

export function GameComplete() {
  return (
    <LeaderboardProvider>
      <GameCompleteContent />
    </LeaderboardProvider>
  );
}
