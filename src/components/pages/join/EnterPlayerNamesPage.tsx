"use client";

import { useGame } from "@/context/GameContext";
import { Seat } from "@/model/participants";
import { EnterPairPlayerNamesPage } from "./pairs/EnterPairPlayerNamesPage";
import { EnterIndividualPlayerNamesPage } from "./individual/EnterIndividualPlayerNamesPage";

interface Props {
  seat: Seat;
  onSubmit: () => void;
}

export function EnterPlayerNamesPage({ seat, onSubmit }: Props) {
  const { game } = useGame();

  if (!game) {
    return null;
  }

  return seat.type == "INDIVIDUAL" ? (
    <EnterIndividualPlayerNamesPage seat={seat} onSubmitPlayer={onSubmit} />
  ) : (
    <EnterPairPlayerNamesPage seat={seat} onSubmitPair={onSubmit} />
  );
}
