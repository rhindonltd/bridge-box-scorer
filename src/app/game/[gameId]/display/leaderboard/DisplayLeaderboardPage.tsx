"use client";

import { useRequiredGame } from "@/context/GameContext";
import { OverallScoreAndParticipant } from "@/model/leaderboard";
import { Leaderboard } from "@/components/leaderboard/Leaderboard";
import { useEffect, useState } from "react";
import { GamePageLayout } from "@/components/layout/GamePageLayout";

export function DisplayLeaderboardPage() {
  const { game } = useRequiredGame();
  const [leaderboardData, setLeaderboardData] =
    useState<OverallScoreAndParticipant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/games/${game.gameId}/leaderboard`)
      .then((r) => r.json())
      .then((data) => {
        if (data.overallScore && data.participants) {
          setLeaderboardData(data as OverallScoreAndParticipant);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [game]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <GamePageLayout
      headerTitle="Leaderboard"
      centerContent={true}
      children={
        <div className="flex-1 min-h-0">
          {leaderboardData ? (
            <Leaderboard overallScoreAndParticipant={leaderboardData} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-6">
              <div className="text-xl font-bold text-gray-900 mb-2">
                No Results Yet
              </div>
              <div className="text-base text-gray-500 text-center">
                Results will appear here once boards have been played.
              </div>
            </div>
          )}
        </div>
      }
    />
  );
}
