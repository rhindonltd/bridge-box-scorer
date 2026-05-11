"use client";

import SelectGamePage from "@/components/pages/join/SelectGamePage";
import { SelectTablePage } from "@/components/pages/join/SelectTablePage";
import { useGame } from "@/context/GameContext";
import { BridgeGame } from "@/db/game-index/schema";
import { fetcher } from "@/lib/fetcher";
import useSWR from "swr";

export default function JoinGame() {
  const { data } = useSWR<BridgeGame[], Error>("/api/games/joinable", fetcher);

  const { gameSelection, selectGame } = useGame();

  return (
    <>
      {gameSelection == null ? (
        <SelectGamePage games={data} onGameSelected={selectGame} />
      ) : (
        <SelectTablePage tables={4} selectTable={() => {}} assigned={[]} />
      )}
    </>
  );
}
