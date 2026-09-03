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
import { Pair, Seat, seatFor } from "@/model/participants";
import { getSocket } from "@/lib/socket";
import { getDirectorToken } from "@/lib/director-token";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import NumberStepper from "@/components/common/NumberStepper";
import { useStartCheck } from "@/hooks/start-check";
import { startGame } from "@/lib/game-service";
import { useSections } from "@/hooks/sections";
import { useState, type ReactNode } from "react";

type Props = {
  /** Persistent setup tab bar rendered at the top of the content area. */
  tabs?: ReactNode;
};

export function ShowTablesPage({ tabs }: Props) {
  const { game, mutateGame } = useRequiredGame();

  const gameId = game.gameId;

  const key = swrKeys.pairs(gameId);

  const pairsFetcher = async (url: string): Promise<Pair[]> => {
    const response: { pairs: Pair[] } = await fetcher(url);
    return response.pairs;
  };

  const { data: pairs } = useSWR<Pair[], Error>(key, pairsFetcher);
  const { sections } = useSections(gameId);

  const { canStart, problems, sitOutSeat } = useStartCheck(gameId);
  const [starting, setStarting] = useState(false);

  async function handleStartGame() {
    if (!canStart || starting) return;
    setStarting(true);
    try {
      await startGame(gameId);
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

  function createTable(section: string, tableNumber: number): DirectorTable {
    const nsSeat = seatFor(section, tableNumber, "NS");
    const ewSeat = seatFor(section, tableNumber, "EW");
    const nsParticipant = pairs?.find((it) => it.initialSeat === nsSeat);
    const ewParticipant = pairs?.find((it) => it.initialSeat === ewSeat);

    return {
      tableNumber,
      players: {
        N: nsParticipant?.player1 ?? null,
        S: nsParticipant?.player2 ?? null,
        E: ewParticipant?.player1 ?? null,
        W: ewParticipant?.player2 ?? null,
      },
      seats: {
        N: nsParticipant ? nsSeat : null,
        S: nsParticipant ? nsSeat : null,
        E: ewParticipant ? ewSeat : null,
        W: ewParticipant ? ewSeat : null,
      },
    };
  }

  function handleResizeSection(section: string, tables: number) {
    getSocket().emit(
      SocketEvents.UPDATE_TABLES,
      {
        gameId,
        section,
        tables,
        directorToken: getDirectorToken(gameId),
      },
      () => mutateGame(),
    );
  }

  function handleEvict(seat: Seat) {
    if (!confirm("Evict this pair from the table?")) return;

    getSocket().emit(
      SocketEvents.EVICT_PARTICIPANT,
      { gameId, seat, directorToken: getDirectorToken(gameId) },
      (res: { success: boolean; error?: string }) => {
        if (!res.success) alert(res.error);
      },
    );
  }

  return (
    <GamePageLayout
      headerTitle="Tables View"
      actions={
        <div className="flex flex-col gap-2">
          {!canStart && problems.length > 0 && (
            <ul className="text-sm text-amber-700 list-disc pl-5">
              {problems.map((problem, i) => (
                <li key={`${problem.code}-${i}`}>{problem.message}</li>
              ))}
            </ul>
          )}
          {canStart && sitOutSeat && (
            <p className="text-sm text-gray-600">
              One pair short — {sitOutSeat} will sit out each round.
            </p>
          )}
          <Button
            value={starting ? "Starting…" : "Start Game"}
            onClick={handleStartGame}
            disabled={!canStart || starting}
          />
        </div>
      }
    >
      {tabs}
      <div className="flex flex-col gap-6">
        {sections.map((s) => {
          const tables = Array.from({ length: s.tables }, (_, i) =>
            createTable(s.section, i + 1),
          );
          const lastTable = tables[tables.length - 1];
          const lastTableOccupied =
            !!lastTable &&
            (lastTable.players.N !== null || lastTable.players.E !== null);

          return (
            <div key={s.section} className="flex flex-col">
              <div className="flex items-center justify-between px-4 pt-4">
                <h2 className="text-lg font-bold text-gray-800">
                  Section {s.section}
                  {s.label !== s.section ? ` — ${s.label}` : ""}
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Tables:</span>
                  <NumberStepper
                    min={1}
                    value={s.tables}
                    onChange={(tables) =>
                      handleResizeSection(s.section, tables)
                    }
                  />
                </div>
              </div>
              <DirectorTableControls
                tables={tables}
                onEvict={handleEvict}
                canRemoveTable={s.tables > 1 && !lastTableOccupied}
              />
            </div>
          );
        })}
      </div>
    </GamePageLayout>
  );
}
