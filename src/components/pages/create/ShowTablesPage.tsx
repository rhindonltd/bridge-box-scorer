"use client";

import DirectorTableControls, {
  DirectorTable,
} from "@/components/tables/DirectorTableControls";
import { useGame } from "@/context/GameContext";
import { fetcher } from "@/lib/fetcher";
import useSWR from "swr";
import { SocketEvents } from "@/socket/socket-events";
import Button from "@/components/common/Button";
import { swrKeys } from "@/swr/swr-keys";
import { useSocketSWRSync } from "@/hooks/socket-swr-sync";
import { Pair, PairSeat, Seat } from "@/model/participants";
import { getSocket } from "@/lib/socket";
import { getDirectorToken } from "@/lib/director-token";
import { GameInfo } from "@/components/common/GameInfo";

type Props = {
  onShowMovementsPage: () => void;
};

export function ShowTablesPage({ onShowMovementsPage }: Props) {
  const { game, mutateGame } = useGame();

  const gameId = game?.gameId;

  const key = gameId ? swrKeys.pairs(gameId) : null;

  const { data } = useSWR<Pair[], Error>(key, fetcher);

  useSocketSWRSync(
    SocketEvents.PARTICIPANTS,
    (p) => ({
      key: swrKeys.pairs(gameId!),
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
    const nsParticipant = data?.find(
      (it) => it.initialSeat === `${tableNumber}NS`,
    );
    const ewParticipant = data?.find(
      (it) => it.initialSeat === `${tableNumber}EW`,
    );

    return {
      tableNumber,
      players: {
        N: nsParticipant?.player1 ?? null,
        S: nsParticipant?.player2 ?? null,
        E: ewParticipant?.player1 ?? null,
        W: ewParticipant?.player2 ?? null,
      },
      seats: {
        N: nsParticipant ? (`${tableNumber}NS` as PairSeat) : null,
        S: nsParticipant ? (`${tableNumber}NS` as PairSeat) : null,
        E: ewParticipant ? (`${tableNumber}EW` as PairSeat) : null,
        W: ewParticipant ? (`${tableNumber}EW` as PairSeat) : null,
      },
    };
  }

  function handleAddTable() {
    getSocket().emit(
      SocketEvents.UPDATE_TABLES,
      { gameId, tables: game!.tables + 1, directorToken: getDirectorToken(gameId!) },
      () => mutateGame(),
    );
  }

  function handleRemoveTable() {
    getSocket().emit(
      SocketEvents.UPDATE_TABLES,
      { gameId, tables: game!.tables - 1, directorToken: getDirectorToken(gameId!) },
      (res: { success: boolean; error?: string }) => {
        if (res.success) mutateGame();
        else alert(res.error);
      },
    );
  }

  function handleEvict(seat: Seat) {
    if (!confirm("Evict this pair from the table?")) return;

    getSocket().emit(
      SocketEvents.EVICT_PARTICIPANT,
      { gameId, seat, directorToken: getDirectorToken(gameId!) },
      (res: { success: boolean; error?: string }) => {
        if (!res.success) alert(res.error);
      },
    );
  }

  const tables = createTables();
  const lastTableOccupied =
    tables.length > 0 &&
    tables[tables.length - 1] &&
    (tables[tables.length - 1].players.N !== null ||
      tables[tables.length - 1].players.E !== null);

  return (
    <>
      <GameInfo />
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
