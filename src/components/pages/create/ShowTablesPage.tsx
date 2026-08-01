"use client";

import { useGame } from "@/context/GameContext";
import { ShowPairsTablesPage } from "@/components/pages/create/pairs/ShowPairsTablesPage";

type Props = {
  onShowMovementsPage: () => void;
};

export function ShowTablesPage({ onShowMovementsPage }: Props) {
  const { game } = useGame();

  if (!game) {
    return null;
  }

  return <ShowPairsTablesPage onShowMovementsPage={onShowMovementsPage} />;
}
