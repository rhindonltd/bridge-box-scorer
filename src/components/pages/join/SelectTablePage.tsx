"use client";

import { SectionInfo } from "@/components/common/SectionInfo";
import SelectTable from "@/components/join/SelectTable";
import { useGame } from "@/context/GameContext";
import { StartingPositionWithPlayer } from "@/db/games/shared/queries/find-starting-positions";
import { fetcher } from "@/lib/fetcher";
import { getSocket } from "@/lib/socket";
import { SocketEvents } from "@/socket/socket-events";
import { useEffect } from "react";
import useSWR, { useSWRConfig } from "swr";

interface Props {}

export function SelectTablePage() {
  const { gameSelection } = useGame();
  const { mutate } = useSWRConfig();

  const gameId = gameSelection?.gameId;

  const { data } = useSWR<StartingPositionWithPlayer[], Error>(
    gameId ? `/api/games/${gameId}/starting-positions` : null,
    fetcher,
  );

  if (!gameSelection) {
    return null;
  }

  useEffect(() => {
    if (!gameId) return;

    const key = `/api/games/${gameId}/starting-positions`;

    function handleReconnect() {
      mutate(key);
    }

    function handleStartingPositions(
      startingPositions: StartingPositionWithPlayer[],
    ) {
      mutate(key, startingPositions, false);
    }

    getSocket().on(SocketEvents.CONNECT, handleReconnect);
    getSocket().on(SocketEvents.SELECTED_SEATS, handleStartingPositions);

    return () => {
      getSocket().off(SocketEvents.CONNECT, handleReconnect);
      getSocket().off(SocketEvents.SELECTED_SEATS, handleStartingPositions);
    };
  }, [gameId, mutate]);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <div className="w-full">
        <SectionInfo />
      </div>

      <SelectTable
        tables={gameSelection.tables}
        setStartingPosition={setStartingPosition}
        startingPositions={data ?? []}
      />
    </div>
  );
}
