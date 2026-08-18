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

type Props = {
  onSetUpMovement: () => void;
  onSetUpTimer: () => void;
  onStartGame: () => void;
};

export function ShowTablesPage({
  onSetUpMovement,
  onSetUpTimer,
  onStartGame,
}: Props) {
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
        <div className="flex h-full min-h-0 flex-col">
          {/* These stay fixed */}
          <div className="flex w-full flex-row gap-2 shrink-0 px-4 pt-2">
            <button
              onClick={onSetUpMovement}
              type="button"
              className="flex-1 rounded-xl border border-gray-200 bg-white p-4 text-left
        shadow-sm
        hover:border-blue-300 hover:bg-blue-50 hover:shadow-md
        active:scale-[0.98]
        transition-all duration-150
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <div className="font-semibold text-gray-900">Movement</div>
              <div className="mt-1 text-sm text-gray-500">
                View and edit the movement
              </div>
            </button>

            <button
              onClick={onSetUpTimer}
              type="button"
              className="flex-1 rounded-xl border border-gray-200 bg-white p-4 text-left
        shadow-sm
        hover:border-blue-300 hover:bg-blue-50 hover:shadow-md
        active:scale-[0.98]
        transition-all duration-150
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <div className="font-semibold text-gray-900">
                Set Up Timer (Optional)
              </div>
              <div className="mt-1 text-sm text-gray-500">
                Configure the round timer
              </div>
            </button>
          </div>

          {/* This scrolls */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <DirectorTableControls
              tables={tables}
              onChange={handleChange}
              onEvict={handleEvict}
              canRemoveTable={game.tables > 1 && !lastTableOccupied}
            />
          </div>
        </div>
      }
      actions={
        <Button value={"Start Game"} onClick={onStartGame} className="w-full" />
      }
    />
  );
}
