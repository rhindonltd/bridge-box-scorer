"use client";

import { useRouter } from "next/navigation";
import { useRequiredGame } from "@/context/GameContext";
import { CorrectResultPage } from "@/app/game/[gameId]/manage/travellers/CorrectResultPage";
import { StartedGuard } from "@/app/game/[gameId]/manage/StateGuards";

export default function CorrectResultRoute() {
  const router = useRouter();
  const { game } = useRequiredGame();

  return (
    <StartedGuard gameId={game.gameId}>
      <CorrectResultPage
        onResultCorrected={() => router.replace(`/game/${game.gameId}/manage`)}
      />
    </StartedGuard>
  );
}
