"use client";

import { BridgeGame } from "@/db/game-index/schema";
import { fetcher } from "@/lib/fetcher";
import { getSocket } from "@/lib/socket";
import { useEffect } from "react";
import useSWR, { useSWRConfig } from "swr";
import { SocketEvents } from "@/socket/socket-events";
import { swrKeys } from "@/swr/swr-keys";
import { useSocketSWRSync } from "@/hooks/socket-swr-sync";
import { SelectGame } from "@/components/common/SelectGame";

interface Props {
  headerTitle: string;
  onGameSelected: (gameId: string) => void;
}

export default function SelectGamePage({ headerTitle, onGameSelected }: Props) {
  const gamesFetcher = async (url: string): Promise<BridgeGame[]> => {
    const response: { games: BridgeGame[] } = await fetcher(url);

    return response.games;
  };

  const { data, isLoading } = useSWR<BridgeGame[], Error>(
    swrKeys.joinableGames,
    gamesFetcher,
  );
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
    <SelectGame
      headerTitle={headerTitle}
      games={data ?? []}
      isLoading={isLoading}
      onGameSelected={onGameSelected}
    />
  );
}
