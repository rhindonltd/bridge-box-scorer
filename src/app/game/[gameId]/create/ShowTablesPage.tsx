"use client";

import DirectorTableControls, {
  DirectorTable,
} from "@/components/tables/DirectorTableControls";
import { useRequiredGame } from "@/context/GameContext";
import { fetcher } from "@/lib/fetcher";
import useSWR from "swr";
import { SocketEvents } from "@/socket/socket-events";
import { swrKeys } from "@/swr/swr-keys";
import { useSocketSWRSync } from "@/hooks/socket-swr-sync";
import { Pair, Seat, seatFor } from "@/model/participants";
import { getSocket } from "@/lib/socket";
import { getDirectorToken } from "@/lib/director-token";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { StepperInput } from "@/components/common/StepperInput";
import { useSetupSections } from "@/components/manage/sections/useSetupSections";
import { useMovementResolution } from "@/hooks/stationary-pairs";
import { useSelectedMovementName } from "@/hooks/selected-movement-name";
import { type ReactNode } from "react";

type Props = {
  /** Setup navigation menu rendered in the header's right-hand slot. */
  menu?: ReactNode;
  /** Navigate to the movement-selection step (e.g. from the movement banner). */
  onEditMovement?: () => void;
};

export function ShowTablesPage({ menu, onEditMovement }: Props) {
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

  // Resolve the selected section's movement into per-table setup facts:
  // stationary pair positions and board placement (round-1 boards, copy,
  // share/relay). Both are empty until a movement is chosen/loaded, and both
  // are suppressed when the section's table count doesn't match the movement's
  // — so a resized section never shows stale guidance.
  const {
    stationary: stationaryPairs,
    placement,
    movementTables,
  } = useMovementResolution(
    currentSection?.selectedMovement ?? null,
    game.gameType,
    currentSection?.tables ?? 0,
  );

  // Movement warning for the currently-selected section:
  //  - no movement chosen yet, or
  //  - a movement is chosen but its table count no longer matches the section
  //    as laid out (resized away from the movement's size).
  // `movementTables` is 0 when nothing is resolved (no movement, or a SPEC
  // lookup still loading), so we only flag a mismatch once it is known (> 0).
  const noMovement = !!currentSection && currentSection.selectedMovement == null;
  const invalidMovement =
    !!currentSection &&
    currentSection.selectedMovement != null &&
    movementTables > 0 &&
    movementTables !== currentSection.tables;
  const showMovementWarning = noMovement || invalidMovement;

  // Display name of the section's selected movement (null when none is chosen
  // or a SPEC lookup is still loading). Shown as a clickable summary so the
  // director sees their choice and can jump back to change it.
  const selectedMovementName = useSelectedMovementName(
    currentSection?.selectedMovement ?? null,
    game.gameType,
  );

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

    // NS/EW stationarity applies to both compass points of that pair.
    const dirs = stationaryPairs.get(tableNumber);

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
      stationary: {
        N: dirs?.ns ?? false,
        S: dirs?.ns ?? false,
        E: dirs?.ew ?? false,
        W: dirs?.ew ?? false,
      },
      // Board setup facts for this table (undefined when no movement is
      // resolved for the section, or the table count doesn't match).
      placement: placement.get(tableNumber),
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
    <GamePageLayout headerTitle="Tables" headerRight={menu}>
      <div className="flex h-full min-h-0 flex-col">
        {/* Yellow, clickable warning pinned under the header when the selected
            section has no movement, or a movement that no longer fits its table
            count. Tapping it jumps to the movement-selection step. */}
        {showMovementWarning && (
          <button
            type="button"
            onClick={() => onEditMovement?.()}
            data-testid="movement-warning-banner"
            className="flex w-full shrink-0 items-center justify-between gap-3 border-b border-yellow-300 bg-yellow-50 px-4 py-3 text-left text-sm font-medium text-yellow-900 hover:bg-yellow-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500"
          >
            <span>
              {noMovement
                ? "Select a movement for this section."
                : "This section’s movement no longer fits its table count. Update the movement."}
            </span>
            <span aria-hidden="true" className="shrink-0 font-semibold">
              →
            </span>
          </button>
        )}

        {/* Section pills pick which section is shown, pinned in a grey bar
            (matching the Movement step). */}
        <div className="flex shrink-0 justify-center border-b border-gray-200 bg-gray-50 px-4 py-3">
          {pills}
        </div>

        {/* Selected-movement summary. Shown when the section has a movement that
            still fits (no warning) and its name has resolved. Tapping it jumps
            to the movement-selection step to change the choice. */}
        {!showMovementWarning && selectedMovementName && (
          <button
            type="button"
            onClick={() => onEditMovement?.()}
            data-testid="selected-movement-summary"
            className="flex w-full shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <span>
              <span className="text-gray-500">Movement: </span>
              <span className="font-semibold text-gray-900">
                {selectedMovementName}
              </span>
            </span>
            <span className="shrink-0 text-xs font-medium text-blue-600">
              Change
            </span>
          </button>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
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
                // Light-grey card with a "{n} tables" header that carries the
                // +/- stepper — mirroring the movement picker's "{n} boards"
                // grouping card.
                <section className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-100 px-4 py-2">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
                      {currentSection.tables}{" "}
                      {currentSection.tables === 1 ? "table" : "tables"}
                    </h2>
                    <div className="w-32">
                      <StepperInput
                        label="Tables"
                        min={1}
                        value={currentSection.tables}
                        onChange={(t) =>
                          handleResizeSection(currentSection.section, t)
                        }
                      />
                    </div>
                  </div>
                  <div className="p-3">
                    <DirectorTableControls
                      tables={tables}
                      onEvict={handleEvict}
                      canRemoveTable={
                        currentSection.tables > 1 && !lastTableOccupied
                      }
                    />
                  </div>
                </section>
              );
            })()}
        </div>
      </div>
      {modal}
    </GamePageLayout>
  );
}
