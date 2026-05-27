"use client";

import ShowTables, { Table } from "@/components/tables/ShowTables";
import { useGame } from "@/context/GameContext";
import { fetcher } from "@/lib/fetcher";
import { getSocket } from "@/lib/socket";
import { useEffect } from "react";
import useSWR, { useSWRConfig } from "swr";

import { SocketEvents } from "@/socket/socket-events";
import Button from "@/components/common/Button";
import { PairInitialSeat } from "@/db/games/pairs/queries/find-pair-initial-seats";

type Props = {
  onShowMovementsPage: () => void;
};

export function ShowPairsTablesPage({ onShowMovementsPage }: Props) {
  const { gameSelection } = useGame();
  const { mutate } = useSWRConfig();

  const gameId = gameSelection?.gameId;

  const { data } = useSWR<PairInitialSeat[], Error>(
    gameId ? `/api/games/pairs/${gameId}/starting-positions` : null,
    fetcher,
  );

  function createTables(): Table[] {
    return Array.from({ length: gameSelection!.tables }, (_, i) =>
      createTable(i + 1),
    );
  }

  function createTable(tableNumber: number): Table {
    const pairsByDirection = Object.fromEntries(
      (data ?? [])
        .filter((x) => x.tableNumber === tableNumber)
        .map((x) => [x.direction, x.pair]),
    );

    return {
      tableNumber,
      players: {
        N: pairsByDirection.NS?.player1 ?? null,
        S: pairsByDirection.NS?.player2 ?? null,
        E: pairsByDirection.EW?.player1 ?? null,
        W: pairsByDirection.EW?.player2 ?? null,
      },
    };
  }

  useEffect(() => {
    if (!gameId) return;

    const socket = getSocket();

    const key = `/api/games/pairs/${gameId}/starting-positions`;

    function handleStartingPositions(payload: {
      startingPositions: PairInitialSeat[];
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
