"use client";

import { useRouter } from "next/navigation";
import { useGame } from "@/context/GameContext";
import { DeleteGamePage } from "@/components/pages/manage/delete-game/DeleteGamePage";

export default function DeleteGameRoute() {
  const router = useRouter();
  const { game } = useGame();

  if (!game) return null;

  return (
    <DeleteGamePage
      onGameDeleted={() => router.replace("/manage/select-game")}
      onCancel={() => router.replace(`/manage/${game.gameId}/menu`)}
    />
  );
}
