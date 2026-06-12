"use client";

import SelectGameGate from "@/components/gate/SelectGameGate";
import JoinAsPlayerPage from "@/components/pages/join/JoinAsPlayerPage";
import { useGame } from "@/context/GameContext";

export default function JoinAsPlayer() {
  const { gameSelection } = useGame();

  if (!gameSelection) {
    return <SelectGameGate nextRoute="/join/player" />;
  }

  return <JoinAsPlayerPage />;
}
