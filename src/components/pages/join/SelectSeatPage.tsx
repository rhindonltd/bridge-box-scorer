"use client";

import { useGame } from "@/context/GameContext";
import { SelectIndividualSeatPage } from "@/components/pages/join/individual/SelectIndividualSeatPage";
import { SelectPairSeatPage } from "@/components/pages/join/pairs/SelectPairSeatPage";
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
    <SelectIndividualSeatPage onSeatSelected={onSeatSelected} />
  ) : (
    <SelectPairSeatPage onSeatSelected={onSeatSelected} />
  );
}
