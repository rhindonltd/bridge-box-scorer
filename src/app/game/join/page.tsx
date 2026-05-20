"use client";

import SelectGamePage from "@/components/pages/join/SelectGamePage";
import { SelectTablePage } from "@/components/pages/join/SelectTablePage";
import { useGame } from "@/context/GameContext";

export default function JoinGame() {
  const { gameSelection } = useGame();

  return (
    <>{gameSelection == null ? <SelectGamePage /> : <SelectTablePage />}</>
  );
}
