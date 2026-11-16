"use client";

import { useRequiredGame } from "@/context/GameContext";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { EnterDealsWizard } from "@/app/game/[gameId]/manage/deals/EnterDealsWizard";
import { StartedGuard } from "@/app/game/[gameId]/manage/StateGuards";

export default function EnterDealsRoute() {
  const { game } = useRequiredGame();
  // Pop back to the menu rather than replacing this entry with another menu
  // entry, which would leave two menus in the history and make the browser back
  // button loop between them.
  const { onBack } = useBackNavigation(`/game/${game.gameId}/manage`);

  return (
    <StartedGuard gameId={game.gameId}>
      <EnterDealsWizard onDealSaved={onBack} />
    </StartedGuard>
  );
}
