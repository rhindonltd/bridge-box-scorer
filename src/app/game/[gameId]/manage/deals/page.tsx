"use client";

import { useRouter } from "next/navigation";
import { useRequiredGame } from "@/context/GameContext";
import { EnterDealsWizard } from "@/app/game/[gameId]/manage/deals/EnterDealsWizard";
import { StartedGuard } from "@/app/game/[gameId]/manage/StateGuards";

export default function EnterDealsRoute() {
  const router = useRouter();
  const { game } = useRequiredGame();

  return (
    <StartedGuard gameId={game.gameId}>
      <EnterDealsWizard
        onDealSaved={() => router.replace(`/game/${game.gameId}/manage`)}
      />
    </StartedGuard>
  );
}
