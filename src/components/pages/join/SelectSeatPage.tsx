"use client";

import { useGame } from "@/context/GameContext";
import { SelectIndividualTablePage } from "@/components/pages/join/individual/SelectIndividualTablePage";
import { SelectPairsTablePage } from "@/components/pages/join/pairs/SelectPairsTablePage";
import { Seat } from "@/model/participants";

interface Props {
  onSeatSelected: (seat: Seat) => void;
}

export function SelectSeatPage({ onSeatSelected }: Props) {
  const { gameSelection } = useGame();

  if (!gameSelection) {
    return null;
  }

  return gameSelection.gameType == "INDIVIDUAL" ? (
    <SelectIndividualTablePage onSeatSelected={onSeatSelected} />
  ) : (
    <SelectPairsTablePage onSeatSelected={onSeatSelected} />
  );
}
