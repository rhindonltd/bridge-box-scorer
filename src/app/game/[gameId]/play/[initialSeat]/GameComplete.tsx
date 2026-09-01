"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { Leaderboard } from "@/components/leaderboard/Leaderboard";
import { OverallScoreAndParticipant } from "@/model/leaderboard";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { fetcher } from "@/lib/fetcher";
import { swrKeys } from "@/swr/swr-keys";

export function GameComplete() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;

  const { data, isLoading } = useSWR<{
    leaderboard: OverallScoreAndParticipant;
  }>(gameId ? swrKeys.leaderboard(gameId) : null, fetcher);

  const leaderboardData = data?.leaderboard ?? null;

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
        {leaderboardData ? (
          <Leaderboard overallScoreAndParticipant={leaderboardData} />
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
