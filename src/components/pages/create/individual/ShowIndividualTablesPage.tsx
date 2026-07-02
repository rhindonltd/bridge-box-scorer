"use client";

import ShowTables, { Table } from "@/components/tables/ShowTables";
import { useGame } from "@/context/GameContext";

import { SocketEvents } from "@/socket/socket-events";
import Button from "@/components/common/Button";
import { useSocketSWRSync } from "@/hooks/socket-swr-sync";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { swrKeys } from "@/swr/swr-keys";
import { Individual } from "@/model/participants";

type Props = {
  onShowMovementsPage: () => void;
};

export function ShowIndividualTablesPage({ onShowMovementsPage }: Props) {
  const { game } = useGame();

  const gameId = game?.gameId;

  const key = gameId ? swrKeys.individuals(gameId) : null;

  const { data } = useSWR<Individual[], Error>(key, fetcher);

  function createTables(): Table[] {
    return Array.from({ length: game!.tables }, (_, i) => createTable(i + 1));
  }

  function createTable(tableNumber: number): Table {
    return {
      tableNumber,
      players: {
        N:
          data?.find((it) => it.initialSeat === `${tableNumber}N`)?.player ??
          null,
        S:
          data?.find((it) => it.initialSeat === `${tableNumber}S`)?.player ??
          null,
        E:
          data?.find((it) => it.initialSeat === `${tableNumber}E`)?.player ??
          null,
        W:
          data?.find((it) => it.initialSeat === `${tableNumber}W`)?.player ??
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
      key: swrKeys.individuals(gameId),
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
