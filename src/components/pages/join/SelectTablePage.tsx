"use client";

import { useGame } from "@/context/GameContext";
import { SelectIndividualTablePage } from "@/components/pages/join/SelectIndividualTablePage";
import { SelectPairsTablePage } from "@/components/pages/join/SelectPairsTablePage";

export function SelectTablePage() {
  const { gameSelection } = useGame();

  if (!gameSelection) {
    return null;
  }

  return gameSelection.gameType == "INDIVIDUAL" ? (
    <SelectIndividualTablePage />
  ) : (
    <SelectPairsTablePage />
  );
}
