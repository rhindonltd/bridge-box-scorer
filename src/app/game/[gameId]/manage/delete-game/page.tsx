"use client";

import { useRouter } from "next/navigation";
import { useRequiredGame } from "@/context/GameContext";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { DeleteGamePage } from "@/app/game/[gameId]/manage/delete-game/DeleteGamePage";

export default function DeleteGameRoute() {
  const router = useRouter();
  const { game } = useRequiredGame();
  // Cancelling pops back to the menu rather than stacking a second menu entry.
  const { onBack } = useBackNavigation(`/game/${game.gameId}/manage`);

  return (
    <DeleteGamePage
      onGameDeleted={() => router.replace("/manage")}
      onCancel={onBack}
    />
  );
}
