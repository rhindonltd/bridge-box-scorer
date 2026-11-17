"use client";

import { useEffect } from "react";
import useSWR, { useSWRConfig } from "swr";
import { SelectGame } from "@/components/common/SelectGame";
import type { BridgeGame } from "@/db/game-index/schema";
import { unwrapFetcher } from "@/lib/fetcher";
import { getSocket } from "@/lib/socket";
import { SocketEvents } from "@/socket/socket-events";
import { swrKeys } from "@/swr/swr-keys";

interface Props {
  onGameSelected: (gameId: string) => void;
}

/**
 * The "Export Game" picker: finalised games only. Anyone can open it (players
 * included) to download results; director-only actions live on the game's
 * export page. Refreshed when the socket reconnects, so a game finalised while
 * this device was offline still appears.
 */
export default function ExportSelectGamePage({ onGameSelected }: Props) {
  const { data, isLoading } = useSWR<BridgeGame[], Error>(
    swrKeys.finalisedGames(),
    unwrapFetcher<BridgeGame[]>("games"),
  );
  const { mutate } = useSWRConfig();

  useEffect(() => {
    const socket = getSocket();
    const revalidate = () => {
      void mutate(swrKeys.finalisedGames());
    };
    socket.on(SocketEvents.CONNECT, revalidate);
    // A finalise / reopen changes the open-games list; refresh with it.
    socket.on(SocketEvents.JOINABLE_GAMES, revalidate);
    return () => {
      socket.off(SocketEvents.CONNECT, revalidate);
      socket.off(SocketEvents.JOINABLE_GAMES, revalidate);
    };
  }, [mutate]);

  return (
    <SelectGame
      headerTitle="Export Game"
      games={data ?? []}
      isLoading={isLoading}
      onGameSelected={onGameSelected}
      emptyMessage="No finalised games yet. A director finalises a game from Manage Game."
      backHref="/"
    />
  );
}
