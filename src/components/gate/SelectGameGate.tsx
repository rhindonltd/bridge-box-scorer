"use client";

import { useGame } from "@/context/GameContext";
import { useRouter } from "next/navigation";
import { BridgeGame } from "@/db/game-index/schema";
import SelectGamePage from "../pages/join/SelectGamePage";

type Props = {
  nextRoute: string;
};

export default function SelectGameGate({ nextRoute }: Props) {
  const { selectGame } = useGame();
  const router = useRouter();

  function onGameSelected(game: BridgeGame) {
    selectGame(game);
    router.push(nextRoute);
  }

  return <SelectGamePage onGameSelected={onGameSelected} />;
}
