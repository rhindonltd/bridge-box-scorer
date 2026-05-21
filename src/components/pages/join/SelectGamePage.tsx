"use client";

import SelectGame from "@/components/join/SelectGame";
import { BridgeGame } from "@/db/game-index/schema";
import { useGame } from "@/context/GameContext";
import { fetcher } from "@/lib/fetcher";
import { getSocket } from "@/lib/socket";
import { useEffect } from "react";
import useSWR, { useSWRConfig } from "swr";
import { SocketEvents } from "@/socket/socket-events";

export default function SelectGamePage() {
  const { data } = useSWR<BridgeGame[], Error>("/api/games/joinable", fetcher);
  const { mutate } = useSWRConfig();
  const { selectGame } = useGame();

  useEffect(() => {
    function handleReconnect() {
      mutate("/api/games/joinable");
    }

    function handleJoinableGames(games: BridgeGame[]) {
      mutate("/api/games/joinable", games, false);
    }

    getSocket().on(SocketEvents.CONNECT, handleReconnect);
    getSocket().on(SocketEvents.JOINABLE_GAMES, handleJoinableGames);

    return () => {
      getSocket().off(SocketEvents.CONNECT, handleReconnect);
      getSocket().off(SocketEvents.JOINABLE_GAMES, handleJoinableGames);
    };
  }, [mutate]);

  return (
    <>
      <div className="w-full">
        <div className="bg-blue-200 py-2 text-center font-bold">
          <span>Select Game</span>
        </div>
      </div>
      {data && <SelectGame games={data} onGameSelected={selectGame} />}
    </>
  );
}
