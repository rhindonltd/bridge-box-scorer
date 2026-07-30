"use client";

import SelectGame from "@/components/join/SelectGame";
import { BridgeGame } from "@/db/game-index/schema";
import { fetcher } from "@/lib/fetcher";
import { getSocket } from "@/lib/socket";
import { useEffect } from "react";
import useSWR, { useSWRConfig } from "swr";
import { SocketEvents } from "@/socket/socket-events";
import { swrKeys } from "@/swr/swr-keys";
import { useSocketSWRSync } from "@/hooks/socket-swr-sync";

interface Props {
  onGameSelected: (gameId: string) => void;
}

export default function SelectGamePage({ onGameSelected }: Props) {
  const { data } = useSWR<BridgeGame[], Error>(swrKeys.joinableGames, fetcher);
  const { mutate } = useSWRConfig();

  useEffect(() => {
    function handleReconnect() {
      mutate(swrKeys.joinableGames);
    }

    getSocket().on(SocketEvents.CONNECT, handleReconnect);

    return () => {
      getSocket().off(SocketEvents.CONNECT, handleReconnect);
    };
  }, [mutate]);

  useSocketSWRSync(
    SocketEvents.JOINABLE_GAMES,
    (p) => ({
      key: swrKeys.joinableGames(),
      data: p.joinableGames,
    }),
    [],
  );

  return (
    <>
      <div className="w-full">
        <div className="bg-blue-100 text-blue-900 py-2 text-center font-bold">
          <span>Select Game</span>
        </div>
      </div>
      {data && <SelectGame games={data} onGameSelected={onGameSelected} />}
    </>
  );
}
