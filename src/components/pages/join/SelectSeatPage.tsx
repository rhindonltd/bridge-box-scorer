"use client";

import { useGame } from "@/context/GameContext";
import { SelectIndividualSeatPage } from "@/components/pages/join/individual/SelectIndividualSeatPage";
import { SelectPairSeatPage } from "@/components/pages/join/pairs/SelectPairSeatPage";
import { Participant, Seat } from "@/model/participants";
import { useState } from "react";

interface Props {
  onSeatSelected: (seat: Seat) => void;
}

export function SelectSeatPage({ onSeatSelected }: Props) {
  const { game } = useGame();

  const [seat, setSeat] = useState<Seat | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);

  if (!game) {
    return null;
  }

  return game.gameType == "INDIVIDUAL" ? (
    <SelectIndividualSeatPage onSeatSelected={setSeat} />
  ) : (
    <SelectPairSeatPage onSeatSelected={setSeat} />
  );
}
