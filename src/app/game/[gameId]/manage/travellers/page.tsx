"use client";

import { useRequiredGame } from "@/context/GameContext";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { CorrectResultPage } from "@/app/game/[gameId]/manage/travellers/CorrectResultPage";
import { StartedGuard } from "@/app/game/[gameId]/manage/StateGuards";

export default function CorrectResultRoute() {
  const { game } = useRequiredGame();
  // Pop back to the menu (see the Deals route for why not replace).
  const { onBack } = useBackNavigation(`/game/${game.gameId}/manage`);

  return (
    <StartedGuard gameId={game.gameId}>
      <CorrectResultPage onResultCorrected={onBack} />
    </StartedGuard>
  );
}
