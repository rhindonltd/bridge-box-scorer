"use client";

import { useRouter } from "next/navigation";
import { useRequiredGame } from "@/context/GameContext";
import { DeleteGamePage } from "@/app/game/[gameId]/manage/delete-game/DeleteGamePage";

export default function DeleteGameRoute() {
  const router = useRouter();
  const { game } = useRequiredGame();

  return (
    <DeleteGamePage
      onGameDeleted={() => router.replace("/manage")}
      onCancel={() => router.replace(`/game/${game.gameId}/manage/menu`)}
    />
  );
}
