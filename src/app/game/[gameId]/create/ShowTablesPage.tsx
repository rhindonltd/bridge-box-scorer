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
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import NumberStepper from "@/components/common/NumberStepper";

type Props = {
  onStartGame: () => void;
};

export function ShowTablesPage({ onStartGame }: Props) {
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
    return Array.from({ length: game!.tables }, (_, i) => createTable(i + 1));
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

  function handleChange(tables: number) {
    getSocket().emit(
      SocketEvents.UPDATE_TABLES,
      {
        gameId,
        tables,
        directorToken: getDirectorToken(gameId!),
      },
      () => mutateGame(),
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
    <GamePageLayout
      headerTitle="Tables View"
      children={
        <DirectorTableControls
          tables={tables}
          onEvict={handleEvict}
          canRemoveTable={game.tables > 1 && !lastTableOccupied}
        />
      }
      headerRight={
          <div className="flex flex-col justify-center p-2">
              <div className="text-center mb-2">Tables:</div>
              <div><NumberStepper min={1} value={tables.length} onChange={handleChange} /></div>
          </div>
      }
      actions={
        <Button value={"Start Game"} onClick={onStartGame} className="w-full" />
      }
    />
  );
}
