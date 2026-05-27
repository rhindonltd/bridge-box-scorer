"use client";

import ShowTables, { Table } from "@/components/tables/ShowTables";
import { useGame } from "@/context/GameContext";
import { fetcher } from "@/lib/fetcher";
import { getSocket } from "@/lib/socket";
import { useEffect } from "react";
import useSWR, { useSWRConfig } from "swr";

import { PlayerInitialSeat } from "@/db/games/shared/queries/find-player-initial-seats";
import { SocketEvents } from "@/socket/socket-events";
import Button from "@/components/common/Button";

type Props = {
  onShowMovementsPage: () => void;
};

export function ShowIndividualTablesPage({ onShowMovementsPage }: Props) {
  const { gameSelection } = useGame();
  const { mutate } = useSWRConfig();

  const gameId = gameSelection?.gameId;

  const { data } = useSWR<PlayerInitialSeat[], Error>(
    gameId ? `/api/games/individual/${gameId}/starting-positions` : null,
    fetcher,
  );

  function createTables(): Table[] {
    return Array.from({ length: gameSelection!.tables }, (_, i) =>
      createTable(i + 1),
    );
  }

  function createTable(tableNumber: number): Table {
    const playersByDirection = Object.fromEntries(
      (data ?? [])
        .filter((x) => x.tableNumber === tableNumber)
        .map((x) => [x.direction, x.player]),
    );

    return {
      tableNumber,
      players: {
        N: playersByDirection.N ?? null,
        S: playersByDirection.S ?? null,
        E: playersByDirection.E ?? null,
        W: playersByDirection.W ?? null,
      },
    };
  }

  useEffect(() => {
    if (!gameId) return;

    const socket = getSocket();

    const key = `/api/games/individual/${gameId}/starting-positions`;

    function handleStartingPositions(payload: {
      startingPositions: PlayerInitialSeat[];
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
    <>
      <ShowTables tables={createTables()} />
      <Button value={"Select Movement"} onClick={onShowMovementsPage} />
    </>
  );
}
