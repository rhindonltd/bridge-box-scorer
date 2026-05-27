"use client";

import { useGame } from "@/context/GameContext";
import { ShowIndividualTablesPage } from "@/components/pages/create/individual/ShowIndividualTablesPage";
import { ShowPairsTablesPage } from "@/components/pages/create/pairs/ShowPairsTablesPage";

type Props = {
  onShowMovementsPage: () => void;
};

export function ShowTablesPage({ onShowMovementsPage }: Props) {
  const { gameSelection } = useGame();

  if (!gameSelection) {
    return null;
  }

  return gameSelection.gameType == "INDIVIDUAL" ? (
    <ShowIndividualTablesPage onShowMovementsPage={onShowMovementsPage} />
  ) : (
    <ShowPairsTablesPage onShowMovementsPage={onShowMovementsPage} />
  );
}
