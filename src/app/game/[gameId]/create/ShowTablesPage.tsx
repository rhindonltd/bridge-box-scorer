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
import { useSetupSections } from "@/components/manage/sections/useSetupSections";
import { useState, type ReactNode } from "react";

type Props = {
  /** Setup navigation menu rendered in the header's right-hand slot. */
  menu?: ReactNode;
};

export function ShowTablesPage({ menu }: Props) {
  const { game, mutateGame } = useRequiredGame();

  const gameId = game.gameId;

  const key = swrKeys.pairs(gameId);

  const pairsFetcher = async (url: string): Promise<Pair[]> => {
    const response: { pairs: Pair[] } = await fetcher(url);
    return response.pairs;
  };

  const { data: pairs } = useSWR<Pair[], Error>(key, pairsFetcher);
  const { sections, selected, pills, modal } = useSetupSections(gameId);

  // The Tables view shows one section at a time (selected via the pills); its
  // table-count stepper is pinned above the scroll area.
  const currentSection = sections.find((s) => s.section === selected);

  const { canStart, problems, sitOutSeat } = useStartCheck(gameId);
  const [starting, setStarting] = useState(false);

  async function handleStartGame() {
    /* v8 ignore next -- `starting` re-entrancy guard: the Start button is disabled while starting, so this operand is unreachable via the UI */
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
      headerRight={menu}
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
      <div className="flex h-full min-h-0 flex-col">
        {/* Section pills pick which section is shown; the selected section's
            table-count stepper is pinned in a centred bar below them. Both stay
            put while the seating grid scrolls. */}
        <div className="flex shrink-0 flex-col items-center gap-3 border-b border-gray-200 bg-gray-100 px-4 py-3">
          {pills}
          {currentSection && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Tables:</span>
              <NumberStepper
                min={1}
                value={currentSection.tables}
                onChange={(tables) =>
                  handleResizeSection(currentSection.section, tables)
                }
              />
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
          {currentSection &&
            (() => {
              const tables = Array.from(
                { length: currentSection.tables },
                (_, i) => createTable(currentSection.section, i + 1),
              );
              const lastTable = tables[tables.length - 1];
              const lastTableOccupied =
                !!lastTable &&
                (lastTable.players.N !== null || lastTable.players.E !== null);

              return (
                <DirectorTableControls
                  tables={tables}
                  onEvict={handleEvict}
                  canRemoveTable={currentSection.tables > 1 && !lastTableOccupied}
                />
              );
            })()}
        </div>
      </div>
      {modal}
    </GamePageLayout>
  );
}
