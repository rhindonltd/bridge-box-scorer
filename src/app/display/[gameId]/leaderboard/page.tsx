"use client";

import { useGame } from "@/context/GameContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Leaderboard } from "@/components/results/leaderboard/Leaderboard";
import { OverallScoreAndParticipant } from "@/model/leaderboard";
import { GameInfo } from "@/components/common/GameInfo";

export default function DisplayLeaderboardRoute() {
  const { game, isLoading } = useGame();
  const router = useRouter();
  const [leaderboardData, setLeaderboardData] =
    useState<OverallScoreAndParticipant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !game) {
      router.replace("/display");
    }
  }, [game, isLoading, router]);

  useEffect(() => {
    if (!game) return;

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

  if (!game) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex flex-row w-full">
        <GameInfo />
      </div>

      <div className="w-full">
        <div className="flex flex-col bg-blue-100 text-blue-900 py-2">
          <div className="text-center font-bold">Results</div>
        </div>
      </div>

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
    </div>
  );
}
