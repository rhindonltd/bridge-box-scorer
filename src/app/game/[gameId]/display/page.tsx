"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DisplayMenuPage } from "@/app/game/[gameId]/display/DisplayMenuPage";
import { LeaderboardModePage } from "@/app/game/[gameId]/display/leaderboard/LeaderboardModePage";
import type { LeaderboardScoringMode } from "@/app/game/[gameId]/display/leaderboard/DisplayLeaderboardView";
import { useRequiredGame } from "@/context/GameContext";

/** Which display sub-screen the menu route is currently showing. */
type Step = "menu" | "leaderboardMode";

export default function DisplayMenuRoute() {
  const router = useRouter();
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;
  const { game } = useRequiredGame();

  const [step, setStep] = useState<Step>("menu");

  const openLeaderboard = (mode?: LeaderboardScoringMode) => {
    const query = mode ? `?mode=${mode}` : "";
    router.push(`/game/${gameId}/display/leaderboard${query}`);
  };

  // Matchpoint pairs standings can be shown as a percentage or raw matchpoints,
  // so those games get a chooser step first. Every other scoring type has a
  // single presentation and goes straight to the board.
  const handleLeaderboardClick = () => {
    if (game.scoringType === "MP") {
      setStep("leaderboardMode");
    } else {
      openLeaderboard();
    }
  };

  if (step === "leaderboardMode") {
    return (
      <LeaderboardModePage
        onSelect={(mode) => openLeaderboard(mode)}
        onBack={() => setStep("menu")}
      />
    );
  }

  return (
    <DisplayMenuPage
      onTimerClick={() => router.push(`/game/${gameId}/display/timer`)}
      onLeaderboardClick={handleLeaderboardClick}
    />
  );
}
