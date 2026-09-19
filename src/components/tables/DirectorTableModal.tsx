"use client";

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";

import Button from "@/components/common/Button";
import { Toggle } from "@/components/common/Toggle";
import type { Player } from "@/db/games/tables/players";
import type { Seat } from "@/model/participants";
import type { DirectorTable } from "@/components/tables/DirectorTableControls";

interface Props {
  /** The table whose seats are being managed; null closes the dialog. */
  table: DirectorTable | null;
  /**
   * Whether the section's movement is Swiss. Only Swiss movements let the
   * director mark a pair stationary, so the stationary controls are hidden
   * otherwise.
   */
  isSwiss: boolean;
  /** Evict the pair occupying `seat` (a whole NS or EW pair). */
  onEvict: (seat: Seat) => void;
  /**
   * Toggle the stationary flag for a pair at this table. `ns` is true for the
   * North/South pair, false for the East/West pair.
   */
  onToggleStationary: (tableNumber: number, ns: boolean) => void;
  /** Close the dialog. */
  onClose: () => void;
}

/** A player's display name, or a placeholder when the seat is empty. */
function playerName(player: Omit<Player, "id"> | null): string {
  if (!player) return "—";
  return `${player.firstName} ${player.lastName}`.trim();
}

/**
 * Per-table management dialog for the director's Tables setup screen. Shows the
 * two pairs seated at the table (North/South and East/West) with their player
 * names, and provides controls to evict a pair from its position and — for
 * Swiss movements — to keep a pair stationary at this table.
 *
 * Presentational: it renders from the passed {@link DirectorTable} and emits
 * `onEvict` / `onToggleStationary` / `onClose`; the caller performs the
 * mutations (and typically closes the dialog after an eviction).
 */
export function DirectorTableModal({
  table,
  isSwiss,
  onEvict,
  onToggleStationary,
  onClose,
}: Props) {
  const open = table != null;

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-150"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-100"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              {table && (
                <TableModalBody
                  table={table}
                  isSwiss={isSwiss}
                  onEvict={onEvict}
                  onToggleStationary={onToggleStationary}
                  onClose={onClose}
                />
              )}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}

function TableModalBody({
  table,
  isSwiss,
  onEvict,
  onToggleStationary,
  onClose,
}: {
  table: DirectorTable;
  isSwiss: boolean;
  onEvict: (seat: Seat) => void;
  onToggleStationary: (tableNumber: number, ns: boolean) => void;
  onClose: () => void;
}) {
  return (
    <>
      <Dialog.Title className="text-lg font-semibold text-gray-900">
        Table {table.tableNumber}
      </Dialog.Title>
      <Dialog.Description className="mt-1 text-sm text-gray-600">
        Manage the pairs seated at this table.
      </Dialog.Description>

      <div className="mt-4 flex flex-col gap-3">
        <PairRow
          label="North / South"
          player1={table.players.N}
          player2={table.players.S}
          seat={table.seats.N}
          stationary={table.stationary?.N ?? false}
          isSwiss={isSwiss}
          onEvict={onEvict}
          onToggleStationary={() => onToggleStationary(table.tableNumber, true)}
        />
        <PairRow
          label="East / West"
          player1={table.players.E}
          player2={table.players.W}
          seat={table.seats.E}
          stationary={table.stationary?.E ?? false}
          isSwiss={isSwiss}
          onEvict={onEvict}
          onToggleStationary={() =>
            onToggleStationary(table.tableNumber, false)
          }
        />
      </div>

      <div className="mt-6 flex">
        <Button
          value="Done"
          onClick={onClose}
          bgColour="bg-gray-100"
          textColour="text-gray-900"
          hoverColour="hover:bg-gray-200"
        />
      </div>
    </>
  );
}

function PairRow({
  label,
  player1,
  player2,
  seat,
  stationary,
  isSwiss,
  onEvict,
  onToggleStationary,
}: {
  label: string;
  player1: Omit<Player, "id"> | null;
  player2: Omit<Player, "id"> | null;
  seat: Seat | null;
  stationary: boolean;
  isSwiss: boolean;
  onEvict: (seat: Seat) => void;
  onToggleStationary: () => void;
}) {
  const occupied = seat != null;
  const stationaryLabelId = `stationary-${label.replace(/\W+/g, "-")}`;

  return (
    <div className="rounded-xl border border-gray-200 p-3">
      <div className="text-sm font-semibold text-gray-700">{label}</div>
      <div className="mt-1 text-base text-gray-900">
        <div>{playerName(player1)}</div>
        <div>{playerName(player2)}</div>
      </div>

      {occupied ? (
        <div className="mt-3 flex flex-col gap-3">
          {isSwiss && (
            <div className="flex items-center justify-between gap-3">
              <span
                id={stationaryLabelId}
                className="text-sm font-medium text-gray-700"
              >
                Stationary
              </span>
              <Toggle
                value={stationary}
                offLabel="No"
                onLabel="Yes"
                labelledBy={stationaryLabelId}
                onChange={onToggleStationary}
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => onEvict(seat)}
            aria-label={`Evict ${label} pair`}
            className="w-full rounded-lg border border-red-200 bg-red-50 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            Evict pair
          </button>
        </div>
      ) : (
        <div className="mt-2 text-sm italic text-gray-500">Empty</div>
      )}
    </div>
  );
}
