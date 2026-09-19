"use client";

import {
  LeaderboardProvider,
  useLeaderboardContext,
} from "@/context/LeaderboardContext";
import { useRequiredGame } from "@/context/GameContext";
import { DisplayLeaderboardView } from "./DisplayLeaderboardView";

function DisplayLeaderboardContent() {
  const { game } = useRequiredGame();
  const { leaderboard, sections, isLoading } = useLeaderboardContext();

  return (
    <DisplayLeaderboardView
      eventName={game.eventName}
      leaderboard={leaderboard}
      sections={sections}
      isLoading={isLoading}
    />
  );
}

export function DisplayLeaderboardPage() {
  return (
    <LeaderboardProvider>
      <DisplayLeaderboardContent />
    </LeaderboardProvider>
  );
}
