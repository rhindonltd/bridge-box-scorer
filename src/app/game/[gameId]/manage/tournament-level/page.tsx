"use client";

import { useRouter } from "next/navigation";
import { useRequiredGame } from "@/context/GameContext";
import { TournamentLevelPage } from "@/app/game/[gameId]/manage/tournament-level/TournamentLevelPage";

export default function TournamentLevelRoute() {
  const router = useRouter();
  const { game } = useRequiredGame();

  return (
    <TournamentLevelPage
      onDone={() => router.replace(`/game/${game.gameId}/manage`)}
    />
  );
}
