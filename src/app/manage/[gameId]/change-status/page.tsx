"use client";

import { useRouter } from "next/navigation";
import { useGame } from "@/context/GameContext";
import { ChangeStatusPage } from "@/components/pages/manage/change-status/ChangeStatusPage";

export default function ChangeStatusRoute() {
  const router = useRouter();
  const { game } = useGame();

  if (!game) return null;

  return (
    <ChangeStatusPage
      onStatusChanged={() => router.replace(`/manage/${game.gameId}/menu`)}
    />
  );
}
