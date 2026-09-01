"use client";

import DirectorTableControls, {
  DirectorTable,
} from "@/components/tables/DirectorTableControls";
import { useRequiredGame } from "@/context/GameContext";
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
import { useStartCheck } from "@/hooks/start-check";
import { startGame } from "@/lib/game-service";
import { useState } from "react";

type Props = {
  /** Navigate to the movement-selection step. */
  onSelectMovement: () => void;
};

export function ShowTablesPage({ onSelectMovement }: Props) {
  const { game, mutateGame } = useRequiredGame();

  const gameId = game.gameId;

  const key = swrKeys.pairs(gameId);

  const pairsFetcher = async (url: string): Promise<Pair[]> => {
    const response: { pairs: Pair[] } = await fetcher(url);

    return response.pairs;
  };

  const { data: pairs } = useSWR<Pair[], Error>(key, pairsFetcher);

  const { canStart, problems, sitOutSeat } = useStartCheck(gameId);
  const [starting, setStarting] = useState(false);

  async function handleStartGame() {
    if (!canStart || starting) return;
    setStarting(true);
    try {
      await startGame(gameId);
      // GAME_UPDATED will refresh the game; navigation into the running game is
      // driven by the game state elsewhere.
      await mutateGame();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to start game");
    } finally {
      setStarting(false);
    }
  }

  useSocketSWRSync(
    SocketEvents.PARTICIPANTS,
    (p) => ({
      key: swrKeys.pairs(gameId),
      data: p.participants,
    }),
    [gameId],
  );

  function createTables(): DirectorTable[] {
    return Array.from({ length: game.tables }, (_, i) => createTable(i + 1));
  }

  function createTable(tableNumber: number): DirectorTable {
    const nsParticipant = pairs?.find(
      (it) => it.initialSeat === `${tableNumber}NS`,
    );
    const ewParticipant = pairs?.find(
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
      headerRight={
        <div className="flex flex-col justify-center p-2">
          <div className="text-center mb-2">Tables:</div>
          <div>
            <NumberStepper
              min={1}
              value={tables.length}
              onChange={handleChange}
            />
          </div>
        </div>
      }
      actions={
        <div className="flex flex-col gap-2">
          {!canStart && problems.length > 0 && (
            <ul className="text-sm text-amber-700 list-disc pl-5">
              {problems.map((problem) => (
                <li key={problem.code}>{problem.message}</li>
              ))}
            </ul>
          )}
          {canStart && sitOutSeat && (
            <p className="text-sm text-gray-600">
              One pair short — {sitOutSeat} will sit out each round.
            </p>
          )}
          <div className="flex gap-2">
            <Button
              value={"Select Movement"}
              onClick={onSelectMovement}
              bgColour="bg-gray-100"
              textColour="text-gray-900"
              hoverColour="hover:bg-gray-200"
            />
            <Button
              value={starting ? "Starting…" : "Start Game"}
              onClick={handleStartGame}
              disabled={!canStart || starting}
            />
          </div>
        </div>
      }
    >
      <DirectorTableControls
        tables={tables}
        onEvict={handleEvict}
        canRemoveTable={game.tables > 1 && !lastTableOccupied}
      />
    </GamePageLayout>
  );
}
