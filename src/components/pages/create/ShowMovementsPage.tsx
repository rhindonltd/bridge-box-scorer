"use client";

import { useGame } from "@/context/GameContext";

import { ShowIndividualMovementsPage } from "./individual/ShowIndividualMovementsPage";
import { ShowPairsMovementsPage } from "./pairs/ShowPairsMovementsPage";

type Props = {
  onShowTablesPage: () => void;
};

export function ShowMovementsPage({ onShowTablesPage }: Props) {
  const { game } = useGame();

  if (!game) {
    return null;
  }

  console.log();

  return game.gameType == "INDIVIDUAL" ? (
    <ShowIndividualMovementsPage onShowTablesPage={onShowTablesPage} />
  ) : (
    <ShowPairsMovementsPage onShowTablesPage={onShowTablesPage} />
  );
}
