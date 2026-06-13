"use client";

import ShowTables, { Table } from "@/components/tables/ShowTables";
import { useGame } from "@/context/GameContext";
import { fetcher } from "@/lib/fetcher";
import useSWR from "swr";

import { SocketEvents } from "@/socket/socket-events";
import Button from "@/components/common/Button";
import { PairInitialSeat } from "@/db/games/pairs/queries/find-pair-initial-seats";
import { swrKeys } from "@/swr/swr-keys";
import { useSocketSWRSync } from "@/hooks/socket-swr-sync";

type Props = {
  onShowMovementsPage: () => void;
};

export function ShowPairsTablesPage({ onShowMovementsPage }: Props) {
  const { game } = useGame();

  const gameId = game?.gameId;

  const key = gameId ? swrKeys.pairsInitialSeats(gameId) : null;

  const { data } = useSWR<PairInitialSeat[], Error>(key, fetcher);

  function createTables(): Table[] {
    return Array.from({ length: game!.tables }, (_, i) => createTable(i + 1));
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

  if (!gameId) {
    return null;
  }

  useSocketSWRSync(
    SocketEvents.STARTING_POSITIONS,
    (p) => ({
      key: swrKeys.pairsInitialSeats(gameId),
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
