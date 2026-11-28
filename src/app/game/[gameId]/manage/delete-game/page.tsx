"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRequiredGame } from "@/context/GameContext";
import { useGameStarted } from "@/hooks/game-started";
import { useBackNavigation } from "@/hooks/useBackNavigation";
import { DeleteGamePage } from "@/app/game/[gameId]/manage/delete-game/DeleteGamePage";

export default function DeleteGameRoute() {
  return (
    // The page reads the `?from=` search param.
    <Suspense>
      <DeleteGame />
    </Suspense>
  );
}

function DeleteGame() {
  const router = useRouter();
  const fromSetup = useSearchParams().get("from") === "setup";
  const { game } = useRequiredGame();
  // A started game is listed under Manage Game; one still being set up is
  // listed under Create Game. Go back to the list it came from.
  const { started } = useGameStarted(game.gameId);
  // Cancelling pops back to the menu rather than stacking a second menu entry.
  // With nothing to pop to (a reload, or a direct link) it goes to the game's
  // own menu: Set Up Game before the start, Manage Game after.
  const { onBack } = useBackNavigation(
    started ? `/game/${game.gameId}/manage` : `/game/${game.gameId}/create`,
  );
  return (
    <DeleteGamePage
      onGameDeleted={() => router.replace(started ? "/manage" : "/create")}
      onCancel={onBack}
      fromSetup={fromSetup}
    />
  );
}
