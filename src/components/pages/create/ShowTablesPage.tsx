"use client";

import ShowTables from "@/components/tables/ShowTables";
import { useGame } from "@/context/GameContext";
import { fetcher } from "@/lib/fetcher";
import { getSocket } from "@/lib/socket";
import { useEffect } from "react";
import useSWR, { useSWRConfig } from "swr";

import { StartingPositionWithPlayer } from "@/db/games/shared/queries/find-starting-positions";
import { SocketEvents } from "@/socket/socket-events";

export function ShowTablesPage() {
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

    const socket = getSocket();

    const key = `/api/games/${gameId}/starting-positions`;

    function handleStartingPositions(payload: {
      startingPositions: StartingPositionWithPlayer[];
    }) {
      mutate(key, payload.startingPositions, false);
    }

    socket.on(SocketEvents.STARTING_POSITIONS, handleStartingPositions);

    return () => {
      socket.off(SocketEvents.STARTING_POSITIONS, handleStartingPositions);
    };
  }, [gameId, mutate]);

  if (!gameSelection) {
    return null;
  }

  return (
    <ShowTables tables={gameSelection.tables} startingPositions={data ?? []} />
  );
}
