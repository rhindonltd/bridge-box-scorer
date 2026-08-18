"use client";

import { SetupGamePage } from "@/app/create/[gameId]/SetupGamePage";
import { useGame } from "@/context/GameContext";

export default function SetUpGameRoute() {
  const { game } = useGame();

  if (!game) {
    return null;
  }

  return <SetupGamePage />;
}
