"use client";

import SelectGamePage from "@/components/pages/join/SelectGamePage";
import { SelectTablePage } from "@/components/pages/join/SelectTablePage";
import { useGame } from "@/context/GameContext";
import { BridgeGame } from "@/db/game-index/schema";
import { fetcher } from "@/lib/fetcher";
import { getSocket } from "@/lib/socket";
import { useEffect } from "react";
import useSWR, { useSWRConfig } from "swr";

export default function JoinGame() {
  const { data } = useSWR<BridgeGame[], Error>("/api/games/joinable", fetcher);

  const { mutate } = useSWRConfig();

  const { gameSelection, selectGame } = useGame();

  useEffect(() => {
    function handleReconnect() {
      mutate("/api/games/joinable");
    }

    function handleJoinableGames(games: BridgeGame[]) {
      mutate("/api/games/joinable", games, false);
    }

    getSocket().on("connect", handleReconnect);
    getSocket().on("joinable-games", handleJoinableGames);

    return () => {
      getSocket().off("connect", handleReconnect);
      getSocket().off("joinable-games", handleJoinableGames);
    };
  }, [mutate]);

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
