"use client";

import { useGame } from "@/context/GameContext";
import { ShowIndividualTablesPage } from "@/components/pages/create/ShowIndividualTablesPage";
import { ShowPairsTablesPage } from "@/components/pages/create/ShowPairsTablesPage";

export function ShowTablesPage() {
  const { gameSelection } = useGame();

  if (!gameSelection) {
    return null;
  }

  return gameSelection.gameType == "INDIVIDUAL" ? (
    <ShowIndividualTablesPage />
  ) : (
    <ShowPairsTablesPage />
  );
}
