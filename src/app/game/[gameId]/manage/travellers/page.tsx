"use client";

import { useRouter } from "next/navigation";
import { useRequiredGame } from "@/context/GameContext";
import { CorrectResultPage } from "@/app/game/[gameId]/manage/travellers/CorrectResultPage";

export default function CorrectResultRoute() {
  const router = useRouter();
  const { game } = useRequiredGame();

  return (
    <CorrectResultPage
      onResultCorrected={() =>
        router.replace(`/game/${game.gameId}/manage/menu`)
      }
    />
  );
}
