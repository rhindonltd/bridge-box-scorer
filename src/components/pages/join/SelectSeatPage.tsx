"use client";

import { useGame } from "@/context/GameContext";
import { SelectIndividualSeatPage } from "@/components/pages/join/individual/SelectIndividualSeatPage";
import { SelectPairSeatPage } from "@/components/pages/join/pairs/SelectPairSeatPage";
import { Seat } from "@/model/participants";

interface Props {
  onSeatSelected: (seat: Seat) => void;
}

export function SelectSeatPage({ onSeatSelected }: Props) {
  const { game } = useGame();

  if (!game) {
    return null;
  }

  return game.gameType == "INDIVIDUAL" ? (
    <SelectIndividualSeatPage onSeatSelected={onSeatSelected} />
  ) : (
    <SelectPairSeatPage onSeatSelected={onSeatSelected} />
  );
}
