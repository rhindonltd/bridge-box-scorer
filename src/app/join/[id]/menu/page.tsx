"use client";

import { useRouter } from "next/navigation";

import { JoinMenuPage } from "@/components/pages/join/JoinMenuPage";
import { useGame } from "@/context/GameContext";

export default function JoinMenu() {
  const { game } = useGame();
  const router = useRouter();

  if (!game) {
    return null;
  }

  function joinAsPlayer() {
    router.push(`/join/${game!.gameId}/player`);
  }

  function showTimer() {
    router.push(`/join/${game!.gameId}/timer`);
  }

  function showLeaderboard() {
    router.push(`/join/${game!.gameId}/leaderboard`);
  }

  return (
    <div style={{ margin: "0 auto" }}>
      <JoinMenuPage
        onJoinAsPlayer={joinAsPlayer}
        onShowTimer={showTimer}
        onShowLeaderboard={showLeaderboard}
      />
    </div>
  );
}
