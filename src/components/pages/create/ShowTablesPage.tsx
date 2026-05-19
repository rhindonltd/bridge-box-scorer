"use client";

import ShowTables from "@/components/tables/ShowTables";
import { useGame } from "@/context/GameContext";
import { fetcher } from "@/lib/fetcher";
import { getSocket } from "@/lib/socket";
import { useEffect } from "react";
import useSWR, { useSWRConfig } from "swr";
import { StartingPositionWithPlayer } from "@/db/games/shared/queries/find-starting-positions";

export function ShowTablesPage() {
  const { gameSelection } = useGame();
  const { mutate } = useSWRConfig();

  const gameId = gameSelection?.gameId;

  const { data } = useSWR<StartingPositionWithPlayer[], Error>(
    gameId ? `/api/games/${gameId}/starting-positions` : null,
    fetcher,
  );

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

    getSocket().on("connect", handleReconnect);
    getSocket().on(
      `game:${gameId}:starting-positions`,
      handleStartingPositions,
    );

    return () => {
      getSocket().off("connect", handleReconnect);
      getSocket().off(
        `game:${gameId}:starting-positions`,
        handleStartingPositions,
      );
    };
  }, [gameId, mutate]);

  if (!gameSelection) {
    return null;
  }

  return (
    <ShowTables tables={gameSelection.tables} startingPositions={data ?? []} />
  );
}
