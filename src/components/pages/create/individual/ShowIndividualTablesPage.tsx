"use client";

import DirectorTableControls, {
  DirectorTable,
} from "@/components/tables/DirectorTableControls";
import { useGame } from "@/context/GameContext";

import { SocketEvents } from "@/socket/socket-events";
import Button from "@/components/common/Button";
import { useSocketSWRSync } from "@/hooks/socket-swr-sync";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { swrKeys } from "@/swr/swr-keys";
import { Individual, IndividualSeat, Seat } from "@/model/participants";
import { getSocket } from "@/lib/socket";

type Props = {
  onShowMovementsPage: () => void;
};

export function ShowIndividualTablesPage({ onShowMovementsPage }: Props) {
  const { game, mutateGame } = useGame();

  const gameId = game?.gameId;

  const key = gameId ? swrKeys.individuals(gameId) : null;

  const { data } = useSWR<Individual[], Error>(key, fetcher);

  useSocketSWRSync(
    SocketEvents.PARTICIPANTS,
    (p) => ({
      key: swrKeys.individuals(gameId!),
      data: p.participants,
    }),
    [gameId],
  );

  if (!gameId || !game) {
    return null;
  }

  function createTables(): DirectorTable[] {
    return Array.from({ length: game!.tables }, (_, i) =>
      createTable(i + 1),
    );
  }

  function createTable(tableNumber: number): DirectorTable {
    const findPlayer = (dir: string) =>
      data?.find((it) => it.initialSeat === `${tableNumber}${dir}`);

    const n = findPlayer("N");
    const s = findPlayer("S");
    const e = findPlayer("E");
    const w = findPlayer("W");

    return {
      tableNumber,
      players: {
        N: n?.player ?? null,
        S: s?.player ?? null,
        E: e?.player ?? null,
        W: w?.player ?? null,
      },
      seats: {
        N: n ? (`${tableNumber}N` as IndividualSeat) : null,
        S: s ? (`${tableNumber}S` as IndividualSeat) : null,
        E: e ? (`${tableNumber}E` as IndividualSeat) : null,
        W: w ? (`${tableNumber}W` as IndividualSeat) : null,
      },
    };
  }

  function handleAddTable() {
    getSocket().emit(
      SocketEvents.UPDATE_TABLES,
      { gameId, tables: game!.tables + 1 },
      () => mutateGame(),
    );
  }

  function handleRemoveTable() {
    getSocket().emit(
      SocketEvents.UPDATE_TABLES,
      { gameId, tables: game!.tables - 1 },
      (res: { success: boolean; error?: string }) => {
        if (res.success) mutateGame();
        else alert(res.error);
      },
    );
  }

  function handleEvict(seat: Seat) {
    if (!confirm("Evict this player from the table?")) return;

    getSocket().emit(
      SocketEvents.EVICT_PARTICIPANT,
      { gameId, seat },
      (res: { success: boolean; error?: string }) => {
        if (!res.success) alert(res.error);
      },
    );
  }

  const tables = createTables();
  const lastTableOccupied =
    tables.length > 0 &&
    tables[tables.length - 1] &&
    Object.values(tables[tables.length - 1].players).some((p) => p !== null);

  return (
    <>
      <DirectorTableControls
        tables={tables}
        onAddTable={handleAddTable}
        onRemoveTable={handleRemoveTable}
        onEvict={handleEvict}
        canRemoveTable={game.tables > 1 && !lastTableOccupied}
      />
      <Button value={"Select Movement"} onClick={onShowMovementsPage} />
    </>
  );
}
