"use client";

import ShowTables, { Table } from "@/components/tables/ShowTables";
import { useGame } from "@/context/GameContext";

import { PlayerInitialSeat } from "@/db/games/shared/queries/find-player-initial-seats";
import { SocketEvents } from "@/socket/socket-events";
import Button from "@/components/common/Button";
import { useSocketSWRSync } from "@/hooks/socket-swr-sync";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { swrKeys } from "@/swr/swr-keys";

type Props = {
  onShowMovementsPage: () => void;
};

export function ShowIndividualTablesPage({ onShowMovementsPage }: Props) {
  const { game } = useGame();

  const gameId = game?.gameId;

  const key = gameId ? swrKeys.individualInitialSeats(gameId) : null;

  const { data } = useSWR<PlayerInitialSeat[], Error>(key, fetcher);

  function createTables(): Table[] {
    return Array.from({ length: game!.tables }, (_, i) => createTable(i + 1));
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

  if (!gameId) {
    return null;
  }

  useSocketSWRSync(
    SocketEvents.STARTING_POSITIONS,
    (p) => ({
      key: swrKeys.individualInitialSeats(gameId),
      data: p.startingPositions,
    }),
    [gameId],
  );

  return (
    <>
      <ShowTables tables={createTables()} />
      <Button value={"Select Movement"} onClick={onShowMovementsPage} />
    </>
  );
}
