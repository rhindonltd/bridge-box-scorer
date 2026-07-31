"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PlayHeader } from "@/components/play/PlayHeader";
import { Leaderboard } from "@/components/results/leaderboard/Leaderboard";
import { OverallScoreAndParticipant } from "@/model/leaderboard";

export function GameComplete() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;
  const [leaderboardData, setLeaderboardData] =
    useState<OverallScoreAndParticipant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;

    fetch(`/api/games/${gameId}/leaderboard`)
      .then((r) => r.json())
      .then((data) => {
        if (data.overallScore && data.participants) {
          setLeaderboardData(data as OverallScoreAndParticipant);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [gameId]);

  if (loading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-gray-100">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col bg-gray-100">
      <PlayHeader detail="Results" />

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
    </div>
  );
}
