"use client";

import ShowTables, { Table } from "@/components/tables/ShowTables";
import { useGame } from "@/context/GameContext";
import { fetcher } from "@/lib/fetcher";
import useSWR from "swr";

import { SocketEvents } from "@/socket/socket-events";
import Button from "@/components/common/Button";
import { swrKeys } from "@/swr/swr-keys";
import { useSocketSWRSync } from "@/hooks/socket-swr-sync";
import { Pair } from "@/model/participants";

type Props = {
  onShowMovementsPage: () => void;
};

export function ShowPairsTablesPage({ onShowMovementsPage }: Props) {
  const { game } = useGame();

  const gameId = game?.gameId;

  const key = gameId ? swrKeys.pairs(gameId) : null;

  const { data } = useSWR<Pair[], Error>(key, fetcher);

  function createTables(): Table[] {
    return Array.from({ length: game!.tables }, (_, i) => createTable(i + 1));
  }

  function createTable(tableNumber: number): Table {
    return {
      tableNumber,
      players: {
        N:
          data?.find((it) => it.initialSeat === `${tableNumber}NS`)?.player1 ??
          null,
        S:
          data?.find((it) => it.initialSeat === `${tableNumber}NS`)?.player2 ??
          null,
        E:
          data?.find((it) => it.initialSeat === `${tableNumber}EW`)?.player1 ??
          null,
        W:
          data?.find((it) => it.initialSeat === `${tableNumber}EW`)?.player2 ??
          null,
      },
    };
  }

  if (!gameId) {
    return null;
  }

  useSocketSWRSync(
    SocketEvents.PARTICIPANTS,
    (p) => ({
      key: swrKeys.pairs(gameId),
      data: p.participants,
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
